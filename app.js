import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://bqjlfdjqaixuvtisamua.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxamxmZGpxYWl4dXZ0aXNhbXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODc5ODksImV4cCI6MjA5MDk2Mzk4OX0.bWx5GNVY-vYkVcaBfnsIAUBTu8HSxlhItutuTwpsmZ0",
);

// ---------------------------------------------------------
// 1. FUNCIÓN PARA COMPRIMIR IMÁGENES ANTES DE SUBIRLAS
// ---------------------------------------------------------
function comprimirImagen(file, calidad = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Redimensionar manteniendo proporción
        const maxW = 1600;
        const scale = maxW / img.width;

        canvas.width = maxW;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convertir a JPEG comprimido
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", calidad);
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------
// 2. MOSTRAR INFORMACIÓN DE LA FOTO SELECCIONADA
// ---------------------------------------------------------
function mostrarInfo(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById("infoFoto").innerHTML = `
    <strong>Foto seleccionada:</strong><br>
    Nombre: ${file.name}<br>
    Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB
  `;
}

// ---------------------------------------------------------
// 3. FUNCIÓN PRINCIPAL PARA SUBIR FOTO
// ---------------------------------------------------------
async function enviarFoto() {
  const fileGaleria = document.getElementById("inputGaleria").files[0];
  const fileCamara = document.getElementById("inputCamara").files[0];

  let file = fileGaleria || fileCamara;

  if (!file) return alert("Primero selecciona o toma una foto");

  const fileOriginal = file; // guardamos el original antes de comprimir

  // Compresión antes de mostrar info (opcional, pero así el usuario ve el tamaño real que se subirá)
  let blobComprimido = await comprimirImagen(file);

  // reconstruimos el archivo con nombre
  file = new File([blobComprimido], fileOriginal.name, { type: "image/jpeg" });

  // Normalizar nombre del archivo
  const nombreLimpio = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_"); // caracteres válidos

  const nombre = `${Date.now()}-${nombreLimpio}`;

  // Subir al bucket
  const { error: uploadError } = await supabase.storage
    .from("fotos")
    .upload(nombre, file);

  if (uploadError) {
    console.error(uploadError);
    return alert("Error al subir la foto");
  }

  // Obtener URL pública
  const urlPublica = supabase.storage.from("fotos").getPublicUrl(nombre)
    .data.publicUrl;

  // Insertar en la tabla
  const { error: insertError } = await supabase.from("fotos_boda").insert({
    url: urlPublica,
    path: nombre,
  });

  if (insertError) {
    console.error(insertError);
    return alert("Error al guardar en la base de datos");
  }

  alert("Foto subida correctamente");

  // Limpiar inputs
  document.getElementById("inputGaleria").value = "";
  document.getElementById("inputCamara").value = "";
  document.getElementById("infoFoto").innerHTML = "";
}

// ---------------------------------------------------------
// 4. EVENTOS DE LOS BOTONES E INPUTS
// ---------------------------------------------------------

// Abrir galería
document.getElementById("btnGaleria").onclick = () => {
  document.getElementById("inputGaleria").click();
};

// Abrir cámara
document.getElementById("btnCamara").onclick = () => {
  document.getElementById("inputCamara").click();
};

// Mostrar info al seleccionar foto
document.getElementById("inputGaleria").addEventListener("change", mostrarInfo);
document.getElementById("inputCamara").addEventListener("change", mostrarInfo);

// Botón SUBIR
document.getElementById("btnSubir").onclick = enviarFoto;
