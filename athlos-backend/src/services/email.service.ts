import { EmailParams, MailerSend, Recipient, Sender } from "mailersend";

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "",
});

const sentFrom = new Sender(
  process.env.MAILERSEND_FROM_EMAIL || "",
  process.env.MAILERSEND_FROM_NAME || "Athlos"
);

export const sendVerificationCode = async (to: string, code: string) => {
  const recipients = [new Recipient(to)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject("Código de verificación - Athlos")
    .setHtml(`
      <h2>Verifica tu cuenta en Athlos</h2>
      <p>Tu código de verificación es:</p>
      <h1>${code}</h1>
      <p>Este código es temporal. Si no solicitaste este registro, ignora este correo.</p>
    `)
    .setText(`Tu código de verificación de Athlos es: ${code}`);

  await mailerSend.email.send(emailParams);
};