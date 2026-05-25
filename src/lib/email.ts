import nodemailer from 'nodemailer';

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: 'foadamenzou@gmail.com',
      pass: process.env.BREVO_SMTP_KEY,
    },
  });
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  attachmentBase64?: string;
  attachmentName?: string;
}) {
  const transporter = getTransporter();

  const mailOptions: nodemailer.SendMailOptions = {
    from: '"Foad Amenzou" <foadamenzou@gmail.com>',
    to: params.to,
    subject: params.subject,
    text: params.body,
    attachments: params.attachmentBase64 && params.attachmentName ? [
      {
        filename: params.attachmentName,
        content: Buffer.from(params.attachmentBase64, 'base64'),
        contentType: 'application/pdf',
      },
    ] : undefined,
  };

  await transporter.sendMail(mailOptions);
}
