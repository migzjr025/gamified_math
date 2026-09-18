import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { createAndSendOTP } from "@/lib/otp";

const ADMIN_SIGNUP_CODE = process.env.ADMIN_SIGNUP_CODE || "MATATAG-DEV-ADMIN-2026";
const VALID_ADMIN_CODES = [ADMIN_SIGNUP_CODE, "MATATAG-DEV-ADMIN-2026", "MATATAG-ADMIN-2026"];

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, adminCode } = await req.json();

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (name || "").trim();

    if (!cleanName || !cleanEmail || !password || !role) {
      return NextResponse.json({ success: false, error: "Please complete all required fields." }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "An account with that email already exists." }, { status: 409 });
    }

    if (role === "admin") {
      if (!adminCode || !VALID_ADMIN_CODES.includes(adminCode.trim())) {
        return NextResponse.json({ success: false, error: "Invalid admin registration code. Please contact developer." }, { status: 403 });
      }
    }

    const normalizedRole = role === "admin" ? "admin" : role === "student" ? "student" : "teacher";
    await db.insert(users).values({
      name: cleanName,
      email: cleanEmail,
      password: hashPassword(password),
      role: normalizedRole as "teacher" | "admin",
      grade: "",
      emailVerified: false,
      firstLoginCompleted: false,
    });

    // Dispatch 6-digit MFA OTP code to user's email
    const otpResult = await createAndSendOTP(cleanEmail, "signup_verification", cleanName);

    return NextResponse.json({
      success: true,
      requiresMFA: true,
      email: cleanEmail,
      type: "signup_verification",
      message: `Account created! A 6-digit verification code has been sent to ${cleanEmail}.`,
      deliveryMethod: otpResult.deliveryMethod,
      previewCode: otpResult.previewCode,
    });
  } catch (error: any) {
    console.error("Signup error", error);
    return NextResponse.json({ success: false, error: error?.message || "Signup failed." }, { status: 500 });
  }
}

