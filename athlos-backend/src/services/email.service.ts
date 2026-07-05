import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendVerificationCode = async (to: string, code: string) => {
  await transporter.sendMail({
    from: `"Athlos" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Código de verificación - Athlos",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">Verifica tu cuenta en Athlos</h2>
        <p style="color: #555; font-size: 15px;">Tu código de verificación es:</p>
        <div style="background: #1a1a2e; color: #fff; font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 8px; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #888; font-size: 13px;">Este código expira en 10 minutos. Si no solicitaste este registro, ignora este correo.</p>
      </div>
    `,
    text: `Tu código de verificación de Athlos es: ${code}`,
  });
};

export const sendPasswordResetCode = async (to: string, code: string) => {
  await transporter.sendMail({
    from: `"Athlos" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Recuperación de contraseña - Athlos",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">🔐 Recupera tu contraseña</h2>
        <p style="color: #555; font-size: 15px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Athlos</strong>.</p>
        <p style="color: #555; font-size: 15px;">Tu código de recuperación es:</p>
        <div style="background: #1a1a2e; color: #fff; font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 8px; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #888; font-size: 13px;">Este código expira en <strong>10 minutos</strong>. Si no solicitaste este cambio, ignora este correo — tu contraseña no cambiará.</p>
      </div>
    `,
    text: `Tu código de recuperación de contraseña de Athlos es: ${code}. Expira en 10 minutos.`,
  });
};

export const sendRewardCode = async (to: string, rewardName: string, code: string, terminos: string = "") => {
  await transporter.sendMail({
    from: `"Athlos" <${process.env.GMAIL_USER}>`,
    to,
    subject: "¡Tu recompensa de Athlos!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">🎁 ¡Felicidades!</h2>
        <p style="color: #555; font-size: 15px;">Has canjeado con éxito: <strong>${rewardName}</strong>.</p>
        <p style="color: #555; font-size: 15px;">Tu código único es:</p>
        <div style="background: #1a1a2e; color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; padding: 20px; border-radius: 8px; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #888; font-size: 13px;">Muestra este código al establecimiento para hacer válido tu beneficio.</p>
        ${terminos ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #777;">
          <strong>Términos y Condiciones:</strong><br/>
          ${terminos}
        </div>` : ''}
      </div>
    `,
    text: `Has canjeado: ${rewardName}. Tu código es: ${code}. Términos: ${terminos}`,
  });
};