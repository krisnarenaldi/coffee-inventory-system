import nodemailer from 'nodemailer';

// Email configuration using Zoho
// Alternative: Use Gmail for testing by changing these settings:
// host: 'smtp.gmail.com', port: 587, and use Gmail app password
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // For development only
    ciphers: 'SSLv3'
  },
  requireTLS: true,
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000, // 5 seconds
  socketTimeout: 10000 // 10 seconds
});

// Verify email configuration
export async function verifyEmailConfig() {
  try {
    console.log('🔍 Testing email configuration...');
    console.log('📧 Email User:', process.env.EMAIL_USER ? '***@coffeelogica.com' : 'NOT_SET');
    console.log('🔐 Password configured:', process.env.EMAIL_PASSWORD ? 'YES' : 'NO');
    
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email server configuration error:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error code:', (error as any).code);
      console.error('Error response:', (error as any).response);
    }
    
    return false;
  }
}

// Base email template with responsive design
function getEmailTemplate(content: string, title: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        /* Reset styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        /* Base styles */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
        }
        
        /* Container */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        /* Header */
        .email-header {
            background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .tagline {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
        }
        
        /* Content */
        .email-content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        
        .message {
            font-size: 16px;
            line-height: 1.7;
            color: #4b5563;
            margin-bottom: 30px;
        }
        
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            transition: transform 0.2s ease;
        }
        
        .button:hover {
            transform: translateY(-2px);
        }
        
        .features {
            background-color: #f9fafb;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
        }
        
        .features h3 {
            color: #1f2937;
            font-size: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .feature-list {
            list-style: none;
            padding: 0;
        }
        
        .feature-list li {
            padding: 8px 0;
            color: #4b5563;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .feature-icon {
            font-size: 18px;
        }
        
        /* Footer */
        .email-footer {
            background-color: #f3f4f6;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer-text {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 15px;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-links a {
            color: #d97706;
            text-decoration: none;
            margin: 0 10px;
            font-weight: 500;
        }
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                box-shadow: none;
            }
            
            .email-header,
            .email-content,
            .email-footer {
                padding: 25px 20px;
            }
            
            .logo {
                font-size: 24px;
            }
            
            .greeting {
                font-size: 22px;
            }
            
            .message {
                font-size: 15px;
            }
            
            .button {
                display: block;
                width: 100%;
                text-align: center;
                padding: 16px;
            }
            
            .features {
                padding: 20px;
                margin: 20px 0;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="logo">
                ☕ Coffee Shop Inventory
            </div>
            <div class="tagline">Professional Coffee Management System</div>
        </div>
        
        <div class="email-content">
            ${content}
        </div>
        
        <div class="email-footer">
            <div class="footer-text">
                Thank you for choosing Coffee Shop Inventory!
            </div>
            <div class="footer-text">
                If you have any questions, feel free to reach out to us at 
                <a href="mailto:info@coffeelogica.com" style="color: #d97706;">info@coffeelogica.com</a>
            </div>
            <div class="social-links">
                <a href="#">Help Center</a> • 
                <a href="#">Documentation</a> • 
                <a href="#">Contact Support</a>
            </div>
            <div class="footer-text" style="margin-top: 20px; font-size: 12px;">
                © 2025 Coffee Shop Inventory. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

// Welcome email template
export function getWelcomeEmailContent(userName: string, planName: string) {
  const content = `
    <div class="greeting">Welcome to Coffee Shop Inventory, ${userName}! ☕</div>
    
    <div class="message">
        We're thrilled to have you join our community of coffee professionals! You've successfully signed up for the <strong>${planName}</strong> plan, and we're excited to help you streamline your coffee business operations.
    </div>
    
    <div class="message">
        Your account is now ready, and you can start managing your coffee inventory, tracking roast batches, and analyzing your operations right away.
    </div>
    
    <a href="${process.env.NEXTAUTH_URL || 'https://www.coffeelogica.com'}/dashboard" class="button">
        Get Started Now →
    </a>
    
    <div class="features">
        <h3>What you can do with Coffee Shop Inventory:</h3>
        <ul class="feature-list">
            <li><span class="feature-icon">📦</span> Manage ingredients and inventory levels</li>
            <li><span class="feature-icon">☕</span> Track roast batches and recipes</li>
            <li><span class="feature-icon">📊</span> Generate detailed reports and analytics</li>
            <li><span class="feature-icon">🚨</span> Set up automated alerts for low stock</li>
            <li><span class="feature-icon">📱</span> Access from any device, anywhere</li>
            <li><span class="feature-icon">🔒</span> Keep your data secure and backed up</li>
        </ul>
    </div>
    
    <div class="message">
        <strong>Need help getting started?</strong><br>
        Check out our <a href="#" style="color: #d97706;">quick start guide</a> or reach out to our support team. We're here to help you succeed!
    </div>
    
    <div class="message">
        Happy brewing!<br>
        <strong>The Coffee Shop Inventory Team</strong>
    </div>
  `;
  
  return getEmailTemplate(content, `Welcome to Coffee Shop Inventory, ${userName}!`);
}

// Password reset email template
export function getPasswordResetEmailContent(userName: string, resetLink: string) {
  const content = `
    <div class="greeting">Password Reset Request</div>
    
    <div class="message">
        Hi ${userName},
    </div>
    
    <div class="message">
        We received a request to reset your password for your Coffee Shop Inventory account. If you made this request, click the button below to create a new password.
    </div>
    
    <a href="${resetLink}" class="button">
        Reset My Password →
    </a>
    
    <div class="message">
        This link will expire in 1 hour for security reasons. If you need a new reset link, you can request one from the login page.
    </div>
    
    <div class="message">
        <strong>Didn't request this?</strong><br>
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </div>
    
    <div class="message">
        For security reasons, if you continue to receive these emails, please contact our support team immediately.
    </div>
    
    <div class="message">
        Best regards,<br>
        <strong>The Coffee Shop Inventory Team</strong>
    </div>
  `;
  
  return getEmailTemplate(content, 'Password Reset - Coffee Shop Inventory');
}

// Send welcome email
export async function sendWelcomeEmail(to: string, userName: string, planName: string) {
  try {
    const htmlContent = getWelcomeEmailContent(userName, planName);
    
    const mailOptions = {
      from: {
        name: 'Coffee Shop Inventory',
        address: process.env.EMAIL_USER || 'noreply@example.com'
      },
      to,
      subject: `Welcome to Coffee Shop Inventory, ${userName}! ☕`,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    return { success: false, error: error.message };
  }
}

// Send password reset email
export async function sendPasswordResetEmail(to: string, userName: string, resetLink: string) {
  try {
    const htmlContent = getPasswordResetEmailContent(userName, resetLink);
    
    const mailOptions = {
      from: {
        name: 'Coffee Shop Inventory',
        address: process.env.EMAIL_USER || 'noreply@example.com'
      },
      to,
      subject: 'Reset Your Password - Coffee Shop Inventory',
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

export default transporter;