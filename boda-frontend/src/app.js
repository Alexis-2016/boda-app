// ---------------------------------------------------------
// 1. FUNCIÓN PARA COMPRIMIR IMÁGENES ANTES DE SUBIRLAS
// ---------------------------------------------------------
function comprimirImagen(file, calidad = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const maxW = 2048;
        const maxH = 2048;

        let newW = img.width;
        let newH = img.height;

        // Mantener proporción sin deformar
        if (newW > maxW || newH > maxH) {
          const ratioW = maxW / newW;
          const ratioH = maxH / newH;
          const ratio = Math.min(ratioW, ratioH);

          newW *= ratio;
          newH *= ratio;
        }

        canvas.width = newW;
        canvas.height = newH;

        ctx.drawImage(img, 0, 0, newW, newH);

        // Detectar orientación
        let orientacion = "cuadrada";
        if (newW > newH) orientacion = "horizontal";
        else if (newH > newW) orientacion = "vertical";

        canvas.toBlob(
          (blob) => {
            resolve({ blob, orientacion });
          },
          "image/jpeg",
          calidad,
        );
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

  const preview = document.getElementById("previewContainer");
  preview.innerHTML = ""; // limpiar

  const reader = new FileReader();

  reader.onload = (e) => {
    preview.innerHTML = `
      <div class="preview-box">
        <img src="${e.target.result}">
        <div class="preview-info">
          <strong>${file.name}</strong><br>
          ${(file.size / 1024 / 1024).toFixed(2)} MB
        </div>
        <button class="preview-delete" onclick="eliminarFoto()">×</button>
      </div>
    `;
  };

  reader.readAsDataURL(file);
}

// ---------------------------------------------------------
// 2.5 MENSAJE DE ÉXITO
// ---------------------------------------------------------
function mostrarMensajeExito() {
  const msg = document.getElementById("mensaje-exito");
  msg.style.display = "flex";

  setTimeout(() => {
    msg.style.display = "none";
  }, 2500);
}

// ---------------------------------------------------------
// 2.6 ELIMINAR FOTO
// ---------------------------------------------------------
function eliminarFoto() {
  document.getElementById("inputGaleria").value = "";
  document.getElementById("previewContainer").innerHTML = "";
}

// ---------------------------------------------------------
// 3. FUNCIÓN PRINCIPAL PARA SUBIR FOTO
// ---------------------------------------------------------
async function enviarFoto() {
  const file = document.getElementById("inputGaleria").files[0];

  if (!file) return alert("Primero selecciona o toma una foto");

  // Comprimir imagen correctamente
  const { blob, orientacion } = await comprimirImagen(file);

  // Crear archivo final comprimido
  const fileComprimido = new File([blob], "foto.jpg", { type: "image/jpeg" });

  // Obtener nombre y mensaje del usuario
  const nombreUsuario = document.getElementById("nombre").value.trim();
  const mensajeUsuario = document.getElementById("mensaje").value.trim();

  // ------------------------------
  // ENVIAR FOTO A TU BACKEND
  // ------------------------------
  const formData = new FormData();
  formData.append("foto", fileComprimido);
  formData.append("usuario", nombreUsuario || "Invitado");
  formData.append("mensaje", mensajeUsuario || "");
  formData.append("orientacion", orientacion);

  const respuesta = await fetch(
    "https://boda-images.alexismerinodev.com/upload",
    {
      method: "POST",
      body: formData,
    },
  );

  if (!respuesta.ok) {
    return alert("Error al enviar la foto al servidor");
  }

  // Mostrar mensaje elegante
  mostrarMensajeExito();

  // Limpiar inputs
  document.getElementById("inputGaleria").value = "";
  document.getElementById("previewContainer").innerHTML = "";
  document.getElementById("nombre").value = "";
  document.getElementById("mensaje").value = "";
}

// ---------------------------------------------------------
// 4. EVENTOS DE LOS BOTONES E INPUTS
// ---------------------------------------------------------
const inputGaleria = document.getElementById("inputGaleria");
const btnGrande = document.getElementById("btn-grande");

if (inputGaleria) {
  inputGaleria.addEventListener("change", mostrarInfo);
}
if (btnGrande) {
  btnGrande.onclick = enviarFoto;
}
