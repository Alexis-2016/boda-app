// ---------------------------------------------------------
// 1. COLA DE FOTOS PARA EL PROYECTOR
// ---------------------------------------------------------
let colaFotos = [];

export function nuevaFotoRecibida(foto) {
  colaFotos.push(foto);
  actualizarProyector();
}

function actualizarProyector() {
  const fotoGrande = document.getElementById("foto-grande");
  const miniaturas = document.getElementById("miniaturas");

  if (colaFotos.length === 0) return;

  const foto = colaFotos[0];

  // Seleccionar animación según orientación
  const animacion = animacionPorOrientacion(foto.orientacion);

  // 1. Foto principal
  fotoGrande.innerHTML = `
    <div style="position:relative;">
      <img src="${foto.url}" class="fotos_proyector ${animacion}">
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

  // 2. Miniaturas
  miniaturas.innerHTML = "";
  const siguientes = colaFotos.slice(1, 6);

  siguientes.forEach((foto, index) => {
    const img = document.createElement("img");
    img.src = `https://boda-images.alexismerinodev.com/foto/${foto.r2_key}`;

    img.onclick = () => {
      const seleccionada = colaFotos.splice(index + 1, 1)[0];
      colaFotos.unshift(seleccionada);
      actualizarProyector();
    };

    miniaturas.appendChild(img);
  });
}

// ---------------------------------------------------------
// 1.1 Animaciones según orientación
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
// 2. CARGAR FOTOS DESDE TU BACKEND
// ---------------------------------------------------------
const contenedor = document.getElementById("fotos");

async function cargarFotos() {
  try {
    const res = await fetch(
      "https://boda-images.alexismerinodev.com/fotos-aprobadas",
    );
    const fotos = await res.json();

    contenedor.innerHTML = "";

    fotos.forEach((foto) => {
      const cont = document.createElement("div");
      cont.id = `foto-${foto.id}`;

      const img = document.createElement("img");
      img.src = `https://boda-images.alexismerinodev.com/foto/${foto.r2_key}`;

      // Añadir clases SOLO una vez
      img.classList.add(
        "foto-proyector",
        clasePorOrientacion(foto.orientacion),
        animacionPorOrientacion(foto.orientacion),
      );

      cont.appendChild(img);
      contenedor.appendChild(cont);
    });
  } catch (err) {
    console.error("Error cargando fotos:", err);
  }
}

cargarFotos();

// Refrescar cada 10 segundos
setInterval(cargarFotos, 10000);

// ---------------------------------------------------------
// 3. SLIDESHOW AUTOMÁTICO
// ---------------------------------------------------------
let indice = 0;

setInterval(() => {
  const fotos = document.querySelectorAll(".fotos_proyector");
  if (fotos.length === 0) return;

  fotos.forEach((f) => (f.style.display = "none"));
  fotos[indice].style.display = "block";

  indice = (indice + 1) % fotos.length;
}, 5000);

// ---------------------------------------------------------
// 4. PANTALLA COMPLETA
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
