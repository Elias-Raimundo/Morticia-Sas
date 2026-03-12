import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderEmail({
  to,
  subject,
  html,
  replyTo,
  pdfBuffer,
  filename,
}) {
  const toList = Array.isArray(to)
    ? to
    : String(to)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const { data, error } = await resend.emails.send({
    from: "Morticia <onboarding@resend.dev>",
    to: toList,
    subject,
    html,
    replyTo: replyTo || undefined,
    attachments: [
      {
        filename,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(error.message || "Error enviando email con Resend");
  }

  return data;
}