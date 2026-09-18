import { NextRequest, NextResponse } from "next/server";
import { verifyOTPCode, OTPType } from "@/lib/otp";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, code, type } = await req.json();
    if (!email || !code || !type) {
      return NextResponse.json({ success: false, error: "Email, code, and type are required." }, { status: 400 });
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    const verifyResult = await verifyOTPCode(cleanEmail, code, type as OTPType);

    if (!verifyResult.success) {
      return NextResponse.json({ success: false, error: verifyResult.error }, { status: 400 });
    }

    // Update user verification status in database
    const updatedUsers = await db
      .update(users)
      .set({
        emailVerified: true,
        firstLoginCompleted: true,
      })
      .where(eq(users.email, cleanEmail))
      .returning();

    if (updatedUsers.length === 0) {
      return NextResponse.json({ success: false, error: "User account not found." }, { status: 404 });
    }

    const user = updatedUsers[0];

    if (!user.approved) {
      return NextResponse.json({
        success: true,
        pendingApproval: true,
        message: "Email verified successfully! Your account is now pending administrator approval. Please wait for an administrator to activate your account.",
        user: { id: user.id, email: user.email, name: user.name, role: user.role, approved: false },
      });
    }

    await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });

    return NextResponse.json({
      success: true,
      pendingApproval: false,
      message: "Verification successful! You are now logged in.",
      user: { id: user.id, email: user.email, name: user.name, role: user.role, approved: true },
    });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to verify security code." }, { status: 500 });
  }
}
