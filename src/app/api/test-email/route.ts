import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailConfig, sendWelcomeEmail } from '../../../../lib/email';

// GET /api/test-email - Test email configuration
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing email configuration...');
    
    // Test email server connection
    const isConfigValid = await verifyEmailConfig();
    
    if (!isConfigValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email server configuration failed. Check your SMTP settings.',
          troubleshooting: {
            host: 'smtp.zoho.com',
            port: 587,
            user: process.env.EMAIL_USER ? '***@coffeelogica.com' : 'NOT_SET',
            suggestions: [
              'Verify email credentials are correct',
              'Check if 2FA is enabled (may need app password)',
              'Ensure SMTP is enabled in Zoho settings',
              'Check firewall/network restrictions'
            ]
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email configuration is valid',
      config: {
        host: 'smtp.zoho.com',
        port: 587,
        user: process.env.EMAIL_USER ? '***@coffeelogica.com' : 'NOT_SET',
        passwordConfigured: !!process.env.EMAIL_PASSWORD
      }
    });
  } catch (error) {
    console.error('❌ Email test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test email configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/test-email - Send test email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('📧 Sending test welcome email to:', email);
    
    const result = await sendWelcomeEmail(
      email, 
      name || 'Test User', 
      'Professional'
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send test email',
          details: result.error
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Test email send error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}