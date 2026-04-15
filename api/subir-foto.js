import { google } from "googleapis";

export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from "formidable";
import fs from "fs";

export default async function handler(req, res) {
  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err)
      return res.status(500).json({ error: "Error al procesar archivo" });

    const file = files.foto;

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const response = await drive.files.create({
      requestBody: {
        name: file.originalFilename,
        parents: [process.env.GOOGLE_FOLDER_ID],
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.filepath),
      },
    });

    const fileId = response.data.id;

    // Hacerlo público
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    const url = `https://drive.google.com/uc?export=view&id=${fileId}`;

    res.status(200).json({ url });
  });
}
