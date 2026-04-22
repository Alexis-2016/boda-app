// ---------------------------------------------------------
// 1. COLA DE FOTOS PARA EL PROYECTOR
// ---------------------------------------------------------
let colaFotos = [];

// Añade una nueva foto a la cola y actualiza la pantalla
export function nuevaFotoRecibida(foto) {
  colaFotos.push(foto);
  actualizarProyector();
}

// Muestra la primera foto de la cola en pantalla grande y el resto como miniaturas
function actualizarProyector() {
  const fotoGrande = document.getElementById("foto-grande");
  const miniaturas = document.getElementById("miniaturas");
  if (colaFotos.length === 0) return;

  const foto = colaFotos[0];
  const animacion = animacionPorOrientacion(foto.orientacion);

  // 1. Foto principal con nombre y mensaje superpuesto
  fotoGrande.innerHTML = `
    <div style="position:relative;">
      <img src="https://boda-images.alexismerinodev.com/foto/${foto.r2_key}" class="fotos_proyector ${animacion}">
      <div style="
        position:absolute;
        bottom:20px;
        left:50%;
        transform:translateX(-50%);
        background:rgba(0,0,0,0.5);
        padding:10px 20px;
        border-radius:10px;
        color:white;
        font-size:24px;
        font-weight:bold;
      ">
        ${foto.nombre_usuario || "Invitado"}
        <br>
        <span style="font-size:20px; font-weight:normal;">
          ${foto.mensaje || ""}
        </span>
      </div>
    </div>
  `;

  // 2. Miniaturas de las siguientes fotos (máximo 5)
  miniaturas.innerHTML = "";
  colaFotos.slice(1, 6).forEach((foto, index) => {
    const img = document.createElement("img");
    img.src = `https://boda-images.alexismerinodev.com/foto/${foto.r2_key}`;

    // Al hacer clic en una miniatura, pasa a ser la foto principal
    img.onclick = () => {
      const seleccionada = colaFotos.splice(index + 1, 1)[0];
      colaFotos.unshift(seleccionada);
      actualizarProyector();
    };

    miniaturas.appendChild(img);
  });
}

// ---------------------------------------------------------
// 1.1 Clases y animaciones según orientación de la foto
// ---------------------------------------------------------
function clasePorOrientacion(orientacion) {
  if (orientacion === "vertical") return "foto-vertical";
  if (orientacion === "horizontal") return "foto-horizontal";
  return "foto-cuadrada";
}

function animacionPorOrientacion(orientacion) {
  if (orientacion === "vertical") return "anim-slide-up";
  if (orientacion === "horizontal") return "anim-zoom";
  return "anim-fade";
}

// ---------------------------------------------------------
// 2. CARGAR FOTOS DESDE EL BACKEND
// ---------------------------------------------------------
async function cargarFotos() {
  try {
    const res = await fetch(
      "https://boda-images.alexismerinodev.com/fotos-aprobadas",
    );
    const fotos = await res.json();

    // Guardar fotos en la cola y actualizar el proyector
    colaFotos = fotos;
    actualizarProyector();
  } catch (err) {
    console.error("Error cargando fotos:", err);
  }
}

// Cargar fotos al iniciar
cargarFotos();

// Refrescar cada 10 segundos para mostrar nuevas fotos
setInterval(cargarFotos, 10000);

// ---------------------------------------------------------
// 3. SLIDESHOW AUTOMÁTICO (cambia de foto cada 5 segundos)
// ---------------------------------------------------------
let indice = 0;

setInterval(() => {
  const fotos = document.querySelectorAll(".fotos_proyector");
  if (fotos.length === 0) return;

  // Ocultar todas las fotos y mostrar solo la actual
  fotos.forEach((f) => (f.style.display = "none"));
  fotos[indice].style.display = "block";

  // Avanzar al siguiente índice de forma circular
  indice = (indice + 1) % fotos.length;
}, 5000);

// ---------------------------------------------------------
// 4. PANTALLA COMPLETA (pulsa F para activar/desactivar)
// ---------------------------------------------------------
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "f") activarPantallaCompleta();
});

function activarPantallaCompleta() {
  const elem = document.documentElement;

  if (!document.fullscreenElement) {
    elem.requestFullscreen().catch((err) => console.error(err));
  } else {
    document.exitFullscreen();
  }
}
