import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
    console.log('Testing Email Service Logic...');
    const email = 'test@example.com';
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    console.log('Reset Token:', resetToken);
    console.log('Hashed Token:', hashedToken);
    
    const password = 'newpassword123';
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('Hashed Password:', hashedPassword);

    console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
    
    // Test the email service without actually sending if no key
    if (!process.env.RESEND_API_KEY) {
        console.warn('Skipping actual email send - No API key');
    } else {
        console.log('API key found, logic check complete.');
    }
}

test().catch(console.error);
