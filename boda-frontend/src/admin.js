const API = "https://boda-images.alexismerinodev.com";

const lista = document.getElementById("lista-fotos");
const loginDiv = document.getElementById("login");
const panelDiv = document.getElementById("panel");

// Si ya está logueado, entrar directo
if (localStorage.getItem("admin") === "true") {
  loginDiv.style.display = "none";
  panelDiv.style.display = "block";
  cargarFotos();
}

// ---------------------------------------------
// LOGIN REAL (usa /admin/login del Worker)
// ---------------------------------------------
document.getElementById("btnLogin").onclick = async () => {
  const password = document.getElementById("pin").value;

  const res = await fetch(`${API}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const data = await res.json();

  if (data.ok) {
    localStorage.setItem("admin", "true");
    loginDiv.style.display = "none";
    panelDiv.style.display = "block";
    cargarFotos();
  } else {
    alert("Contraseña incorrecta");
  }
};

// ---------------------------------------------
// CARGAR TODAS LAS FOTOS (sin aprobación)
// ---------------------------------------------
async function cargarFotos() {
  const res = await fetch(`${API}/admin/fotos`);
  const fotos = await res.json();

  lista.innerHTML = "";

  fotos.forEach((foto) => {
    const div = document.createElement("div");
    div.className = "foto-card";

    div.innerHTML = `
      <img src="${API}/foto/${foto.r2_key}">
      
      <div>
        <p><strong>${foto.nombre_usuario}</strong></p>
        <p>${foto.mensaje || ""}</p>
        <p><small>ID: ${foto.id}</small></p>
      </div>

      <div style="margin-left:auto;">
        <button class="rechazar" onclick="eliminar(${foto.id})">Eliminar</button>
      </div>
    `;

    lista.appendChild(div);
  });
}

// ---------------------------------------------
// ELIMINAR FOTO (nuevo endpoint /admin/eliminar/:id)
// ---------------------------------------------
async function eliminar(id) {
  if (!confirm("¿Seguro que quieres eliminar esta foto?")) return;

  await fetch(`${API}/admin/eliminar/${id}`, {
    method: "DELETE",
  });

  cargarFotos();
}

// ---------------------------------------------
// AUTO-REFRESH SOLO SI EL PANEL ESTÁ ABIERTO
// ---------------------------------------------
setInterval(() => {
  if (panelDiv.style.display === "block") {
    cargarFotos();
  }
}, 5000);
