import nodemailer from "nodemailer";

interface SendOTPOptions {
  to: string;
  code: string;
  type: "signup_verification" | "first_login_mfa";
  recipientName?: string;
}

export async function sendOTPEmail({ to, code, type, recipientName }: SendOTPOptions) {
  const isSignup = type === "signup_verification";
  const subject = isSignup
    ? `Your Matatag Math Registration Verification Code: ${code}`
    : `Your Matatag Math First Login Security Code: ${code}`;

  const actionText = isSignup
    ? "complete your registration on the Gamified Math Grading System"
    : "verify your identity for your first login";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #a78bfa; font-size: 24px; margin: 0;">🎮 Gamified Mathematics</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">DepEd Matatag Curriculum Platform</p>
      </div>
      
      <div style="background-color: #1e1b4b; border: 1px solid #4338ca; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="color: #e2e8f0; font-size: 15px; margin-top: 0;">
          Hello ${recipientName ? `<strong>${recipientName}</strong>` : "Teacher/Student"},
        </p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
          Please use the 6-digit security code below to ${actionText}.
        </p>
        
        <div style="margin: 28px 0;">
          <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; background: #0f172a; padding: 12px 24px; border-radius: 10px; border: 2px dashed #38bdf8; display: inline-block;">
            ${code}
          </span>
        </div>
        
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
          ⏱️ This code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px;">
        Matatag Mathematics Grading & Academic Assessment System · Secure Multi-Factor Authentication
      </div>
    </div>
  `;

  const textContent = `Hello ${recipientName || "User"},\n\nYour verification code is: ${code}\n\nUse this code to ${actionText}. This code will expire in 10 minutes.\n\nGamified Mathematics Team`;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || '"Matatag Math Security" <noreply@matatag.edu.ph>';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[MFA Email] Successfully sent OTP to ${to} via SMTP`);
      return { success: true, method: "smtp" as const };
    } catch (err) {
      console.error("[MFA Email] SMTP Error, fallback to simulation:", err);
    }
  }

  // Fallback / simulated delivery (logs OTP in server console for quick access)
  console.log("====================================================");
  console.log(`[MFA OTP DISPATCH] TO: ${to} | CODE: ${code} | TYPE: ${type}`);
  console.log("====================================================");

  return { success: true, method: "simulation" as const, previewCode: code };
}
