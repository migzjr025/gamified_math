import { db } from "@/db";
import { otpCodes, users } from "@/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { sendOTPEmail } from "@/lib/email";

export type OTPType = "signup_verification" | "first_login_mfa";

export function generateOTPCode(): string {
  // Generate cryptographically-like 6-digit numeric OTP (100000 to 999999)
  const min = 100000;
  const max = 999999;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

export async function createAndSendOTP(email: string, type: OTPType, recipientName?: string) {
  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // Invalidate any previous unconsumed codes for this email and type
  await db
    .update(otpCodes)
    .set({ consumed: true })
    .where(and(eq(otpCodes.email, email), eq(otpCodes.type, type), eq(otpCodes.consumed, false)));

  // Insert fresh OTP record
  await db.insert(otpCodes).values({
    email,
    code,
    type,
    expiresAt,
    consumed: false,
  });

  // Dispatch via email
  const sendResult = await sendOTPEmail({
    to: email,
    code,
    type,
    recipientName,
  });

  return {
    success: true,
    expiresAt,
    previewCode: sendResult.previewCode,
    deliveryMethod: sendResult.method,
  };
}

export async function verifyOTPCode(email: string, code: string, type: OTPType) {
  const cleanCode = code.trim();
  const now = new Date();

  // Find latest matching unconsumed, unexpired OTP code
  const records = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, email),
        eq(otpCodes.code, cleanCode),
        eq(otpCodes.type, type),
        eq(otpCodes.consumed, false),
        gt(otpCodes.expiresAt, now)
      )
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (records.length === 0) {
    return { success: false, error: "Invalid or expired verification code. Please request a new code." };
  }

  // Mark OTP code as consumed
  await db
    .update(otpCodes)
    .set({ consumed: true })
    .where(eq(otpCodes.id, records[0].id));

  return { success: true };
}
