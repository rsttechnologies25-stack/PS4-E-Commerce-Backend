import { Resend } from 'resend';

const getResendClient = () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('RESEND_API_KEY is missing. Emails will not be sent.');
        return null;
    }
    return new Resend(apiKey);
};

export const sendResetPasswordEmail = async (email: string, token: string, isAdmin: boolean = false, frontendUrlOverride?: string) => {
    const resend = getResendClient();
    
    // Choose the base URL: Priority 1: Override from frontend, Priority 2: Env Var, Priority 3: Localhost
    const baseUrl = frontendUrlOverride || (isAdmin ? process.env.ADMIN_URL : process.env.FRONTEND_URL);
    const fallbackUrl = isAdmin ? 'http://localhost:3001' : 'http://localhost:3000';
    
    const resetUrl = `${baseUrl || fallbackUrl}/reset-password?token=${token}`;

    if (!resend) {
        console.error('Email failed: Resend client not initialized (missing API key)');
        console.log('RESET LINK (LOG ONLY):', resetUrl);
        return;
    }

    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    try {
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: 'Password Reset Request - PS4 Sweets',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h2 style="color: #8B4513; text-align: center;">Password Reset Request</h2>
                    <p>Hello,</p>
                    <p>We received a request to reset your password for your PS4 Sweets account. Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p>This link will expire in 30 minutes.</p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #777; text-align: center;">PS4 Sweets - Quality Sweets & Savouries</p>
                </div>
            `,
        });

        if (error) {
            console.error('Resend error:', error);
            throw new Error(error.message);
        }

        console.log(`Password reset email sent to ${email} via Resend. ID: ${data?.id}`);
    } catch (error) {
        console.error('Error sending password reset email:', error);
        console.log('RESET LINK (DEV ONLY):', resetUrl);
    }
};
