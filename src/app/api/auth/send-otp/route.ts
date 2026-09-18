import { NextRequest, NextResponse } from "next/server";
import { createAndSendOTP, OTPType } from "@/lib/otp";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { email, type } = await req.json();
    if (!email || !type) {
      return NextResponse.json({ success: false, error: "Email and OTP type are required." }, { status: 400 });
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    const user = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    const otpResult = await createAndSendOTP(
      cleanEmail,
      type as OTPType,
      user[0]?.name
    );

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
      expiresAt: otpResult.expiresAt,
      deliveryMethod: otpResult.deliveryMethod,
      previewCode: otpResult.previewCode,
    });
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to send verification code." }, { status: 500 });
  }
}
