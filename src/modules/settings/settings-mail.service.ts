import { Resend } from "resend";

const resend =
  new Resend(
    process.env.RESEND_API_KEY
  );

export async function sendSettingsOtp(
  email: string,
  code: string
) {

  if (process.env.SHOW_DEBUG_OTP === "true") {
    return;
  }

  await resend.emails.send({

    from:
      process.env.MAIL_FROM!,

    to: email,

    subject:
      "Código de verificación",

    html: `
      <h2>
        Código de verificación
      </h2>

      <p>
        ${code}
      </p>

      <p>
        Expira en 5 minutos.
      </p>
    `
  });
}