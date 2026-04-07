
export const getEmailTemplate = ({
    title,
    subtitle,
    recipientName,
    message,
    ctaText,
    ctaLink,
    footerText,
    warning = false
}: {
    title: string;
    subtitle?: string;
    recipientName: string;
    message: string;
    ctaText?: string;
    ctaLink?: string;
    footerText?: string;
    warning?: boolean;
}) => {
    const primaryColor = '#2563eb';
    const accentColor = '#4f46e5';
    const backgroundColor = '#f8fafc';
    const containerColor = '#ffffff';
    const textColor = '#334155';
    const headingColor = '#0f172a';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <style>
        body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: ${textColor}; margin: 0; padding: 0; background-color: ${backgroundColor}; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 40px auto; background-color: ${containerColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08); border: 1px solid #f1f5f9; }
        .header { background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); padding: 48px 40px; text-align: center; }
        .logo { color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
        .logo-sub { color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; display: block; }
        .content { padding: 48px 40px; background-color: ${containerColor}; }
        .greeting { font-size: 24px; font-weight: 700; margin-top: 0; color: ${headingColor}; margin-bottom: 24px; letter-spacing: -0.3px; }
        .message { font-size: 16px; color: ${textColor}; margin-bottom: 32px; white-space: pre-line; line-height: 1.8; }
        .cta-container { text-align: center; margin: 48px 0; }
        .footer { background-color: #f8fafc; padding: 32px 40px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #f1f5f9; }
        
        /* Button Styles */
        .btn-table { margin: 0 auto; }
        .btn-cell { background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: all 0.3s ease; }
        .btn-link { display: inline-block; padding: 18px 42px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 12px; font-family: sans-serif; letter-spacing: 0.3px; }
        
        .divider { height: 1px; background-color: #e2e8f0; margin: 32px 0; width: 100%; }
        .footer-links a { color: #64748b; text-decoration: none; margin: 0 8px; font-weight: 500; }
        .footer-links a:hover { color: ${primaryColor}; }

        @media only screen and (max-width: 600px) {
            .container { margin: 0; border-radius: 0; border: none; width: 100% !important; }
            .content { padding: 32px 24px; }
            .header { padding: 40px 24px; }
            .btn-link { display: block; padding: 16px 0; width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo">Levitate<span style="opacity: 0.9">Labs</span></div>
            <span class="logo-sub">Operating System</span>
        </div>

        <!-- Main Content -->
        <div class="content">
            <h2 class="greeting">Hi ${recipientName},</h2>
            
            <div class="message">
                ${message}
            </div>
            
            <!-- CTA Button -->
            ${ctaText && ctaLink ? `
            <div class="cta-container">
                <table class="btn-table" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td class="btn-cell">
                            <a href="${ctaLink}" class="btn-link" target="_blank">
                                ${ctaText}
                            </a>
                        </td>
                    </tr>
                </table>
            </div>
            ` : ''}
            
            ${footerText ? `
            <div style="margin-top: 48px;">
                <div class="divider"></div>
                <div style="color: ${headingColor}; font-weight: 600; font-size: 15px; white-space: pre-line; line-height: 1.6;">${footerText}</div>
            </div>
            ` : ''}
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-links" style="margin-bottom: 24px;">
                <a href="https://levitatelabs.online">Website</a> •
                <a href="https://levitatelabs.online/login">Login</a> •
                <a href="mailto:support@levitatelabs.online">Support</a>
            </div>
            <p>&copy; ${new Date().getFullYear()} Levitate Labs. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
};
