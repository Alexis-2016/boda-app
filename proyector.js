import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://bqjlfdjqaixuvtisamua.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxamxmZGpxYWl4dXZ0aXNhbXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODc5ODksImV4cCI6MjA5MDk2Mzk4OX0.bWx5GNVY-vYkVcaBfnsIAUBTu8HSxlhItutuTwpsmZ0",
);

// Funcion para mostrar imagenes en grande al hacer click y cola en el proyector
let colaFotos = []; // aquí se guardan todas las fotos nuevas

export function nuevaFotoRecibida(foto) {
  colaFotos.push(foto);
  actualizarProyector();
}

function actualizarProyector() {
  const fotoGrande = document.getElementById("foto-grande");
  const miniaturas = document.getElementById("miniaturas");

  // Si no hay fotos, no hacemos nada
  if (colaFotos.length === 0) return;

  // 1. Mostrar la primera foto en grande
  fotoGrande.innerHTML = `
    <img src="${colaFotos[0].url}" class="foto-proyector ${animacionAleatoria()}">
  `;

  // 2. Mostrar las siguientes 5 fotos como miniaturas
  miniaturas.innerHTML = "";

  const siguientes = colaFotos.slice(1, 6);

  siguientes.forEach((foto, index) => {
    const img = document.createElement("img");
    img.src = foto.url;

    // Si haces clic en una miniatura → pasa a ser la grande
    img.onclick = () => {
      // mover la foto seleccionada al frente
      const seleccionada = colaFotos.splice(index + 1, 1)[0];
      colaFotos.unshift(seleccionada);
      actualizarProyector();
    };

    miniaturas.appendChild(img);
  });
}

const animaciones = [
  "anim-fade",
  "anim-zoom",
  "anim-slide-up",
  "anim-slide-right",
  "anim-rotate",
];

function animacionAleatoria() {
  return animaciones[Math.floor(Math.random() * animaciones.length)];
}

const contenedor = document.getElementById("fotos");

async function cargarFotos() {
  const { data, error } = await supabase
    .from("fotos_boda")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  contenedor.innerHTML = "";

  data.forEach((foto) => {
    const cont = document.createElement("div");
    cont.id = `foto-${foto.id}`;

    const img = document.createElement("img");
    img.src = foto.url;
    img.classList.add("foto-proyector", animacionAleatoria());

    cont.appendChild(img);
    contenedor.appendChild(cont);
  });
}

cargarFotos();

// Tiempo real
supabase
  .channel("realtime-fotos")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "fotos_boda" },
    (payload) => {
      const cont = document.createElement("div");
      cont.id = `foto-${payload.new.id}`;

      const img = document.createElement("img");
      img.src = payload.new.url;
      img.classList.add("foto-proyector");

      cont.appendChild(img);
      contenedor.prepend(cont);
    },
  )
  .subscribe();

// Función para borrar fotos (no expuesta en el UI, pero útil para pruebas)

async function borrarFoto(id, path) {
  // 1. Borrar del bucket
  const { error: storageError } = await supabase.storage
    .from("fotos")
    .remove([path]);

  if (storageError) {
    console.error(storageError);
    alert("Error al borrar del storage");
    return;
  }

  // 2. Borrar de la tabla
  const { error: dbError } = await supabase
    .from("fotos_boda")
    .delete()
    .eq("id", id);

  if (dbError) {
    console.error(dbError);
    alert("Error al borrar de la base de datos");
    return;
  }

  // 3. Quitar la imagen del DOM
  const elemento = document.getElementById(`foto-${id}`);
  if (elemento) elemento.remove();
}

// slideshow automático

let indice = 0;

setInterval(() => {
  const fotos = document.querySelectorAll(".foto-proyector");
  if (fotos.length === 0) return;

  fotos.forEach((f) => (f.style.display = "none"));

  fotos[indice].style.display = "block";

  indice = (indice + 1) % fotos.length;
}, 5000); // cambia cada 5 segundos

// funcion para pantalla completa

document.addEventListener("keydown", (e) => {
  // Tecla F para pantalla completa
  if (e.key.toLowerCase() === "f") {
    activarPantallaCompleta();
  }
});

function activarPantallaCompleta() {
  const elem = document.documentElement;

  if (!document.fullscreenElement) {
    elem.requestFullscreen().catch((err) => {
      console.error(`Error al entrar en pantalla completa: ${err}`);
    });
  } else {
    document.exitFullscreen();
  }
}
