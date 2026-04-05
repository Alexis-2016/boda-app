import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://bqjlfdjqaixuvtisamua.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxamxmZGpxYWl4dXZ0aXNhbXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODc5ODksImV4cCI6MjA5MDk2Mzk4OX0.bWx5GNVY-vYkVcaBfnsIAUBTu8HSxlhItutuTwpsmZ0",
);

// Cambia este PIN por el que quieras
const PIN_ADMIN = "1989";

const loginDiv = document.getElementById("login");
const panelDiv = document.getElementById("panel");
const fotosDiv = document.getElementById("fotos");

document.getElementById("btnLogin").onclick = () => {
  const pin = document.getElementById("pin").value;
  if (pin === PIN_ADMIN) {
    loginDiv.style.display = "none";
    panelDiv.style.display = "block";
    cargarFotos();
  } else {
    alert("PIN incorrecto");
  }
};

async function cargarFotos() {
  const { data, error } = await supabase
    .from("fotos_boda")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  fotosDiv.innerHTML = "";

  data.forEach((foto) => {
    const cont = document.createElement("div");
    cont.id = `foto-${foto.id}`;
    cont.style.position = "relative";
    cont.style.display = "inline-block";
    cont.style.margin = "10px";

    const img = document.createElement("img");
    img.src = foto.url;
    img.classList.add("foto-proyector");

    const btn = document.createElement("button");
    btn.textContent = "Eliminar";
    btn.style.position = "absolute";
    btn.style.top = "10px";
    btn.style.right = "10px";
    btn.style.padding = "5px 10px";
    btn.style.background = "rgba(255, 0, 0, 0.8)";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.borderRadius = "5px";
    btn.style.cursor = "pointer";

    btn.onclick = () => borrarFoto(foto.id, foto.path);

    cont.appendChild(img);
    cont.appendChild(btn);
    fotosDiv.appendChild(cont);
  });
}

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

  // 3. Quitar del DOM
  const elemento = document.getElementById(`foto-${id}`);
  if (elemento) elemento.remove();
}
