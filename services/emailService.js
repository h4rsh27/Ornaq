import nodemailer from "nodemailer";

let transporter;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        : undefined
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true
  });
  return transporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) return;
  const mailer = await getTransporter();
  const info = await mailer.sendMail({
    from: process.env.EMAIL_FROM || "ornac@local.test",
    to,
    subject,
    text,
    html
  });

  if (!process.env.SMTP_HOST) {
    console.log("Email preview:", info.message?.toString?.() || info.messageId);
  }

  return info;
};
