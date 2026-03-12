import nodemailer from "nodemailer";


export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port:587,
  secure:false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOrderEmail({ to, subject, html, replyTo, pdfBuffer, filename }) {
  const toList = Array.isArray(to) ? to : String(to).split(",").map(s => s.trim());

  return transporter.sendMail({
    from: `"Morticia-SAS" <${process.env.EMAIL_USER}>`,
    to: toList,
    replyTo: replyTo || undefined,
    subject,
    html,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}