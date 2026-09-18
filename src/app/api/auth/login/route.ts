import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { createAndSendOTP } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const fallbackDemoUser = { id: 1, email: "teacher@matatag.edu.ph", name: "Arminda Villeno", role: "teacher" };

  let email = "";
  let password = "";

  try {
    const body = await req.json();
    email = (body?.email || "").trim().toLowerCase();
    password = body?.password || "";
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    // 1. Check if database user exists
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (result.length > 0 && verifyPassword(password, result[0].password)) {
      const user = result[0];

      // If user hasn't completed email verification or first-time login MFA
      if (!user.emailVerified || !user.firstLoginCompleted) {
        const otpType = !user.emailVerified ? "signup_verification" : "first_login_mfa";
        const otpResult = await createAndSendOTP(user.email, otpType, user.name);

        return NextResponse.json({
          success: true,
          requiresMFA: true,
          email: user.email,
          type: otpType,
          message: otpType === "signup_verification"
            ? `Please verify your email. A 6-digit security code has been sent to ${user.email}.`
            : `First-time login verification required. A 6-digit security code has been sent to ${user.email}.`,
          deliveryMethod: otpResult.deliveryMethod,
          previewCode: otpResult.previewCode,
        });
      }

      // Check if user is approved by admin
      if (!user.approved) {
        return NextResponse.json({
          error: "Your account is pending administrator approval. Please wait for an administrator to activate your account."
        }, { status: 403 });
      }

      // Verified and approved user -> Establish session
      await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
      return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }

    // 2. Demo fallback account (always ready for direct demo login)
    if (email === fallbackDemoUser.email && password === "password123") {
      await createSession({ ...fallbackDemoUser });
      return NextResponse.json({ success: true, user: fallbackDemoUser });
    }

    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  } catch (e) {
    console.error("Login DB error:", e);
    // If DB is temporarily unreachable or empty, allow demo account
    if (email === fallbackDemoUser.email && password === "password123") {
      await createSession({ ...fallbackDemoUser });
      return NextResponse.json({ success: true, user: fallbackDemoUser });
    }
    return NextResponse.json({ error: "Database connection error. Please verify DATABASE_URL and ensure tables are created." }, { status: 500 });
  }
}

