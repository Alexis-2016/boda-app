import { google } from "googleapis";

export default async function handler(req, res) {
  const { code } = req.query;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  const { tokens } = await oauth2Client.getToken(code);

  // Guarda los tokens en Vercel (manual)
  console.log("COPIA ESTOS TOKENS Y PÉGALOS EN VERCEL:");
  console.log(tokens);

  res.send("Autenticación completada. Revisa los logs de Vercel.");
}
