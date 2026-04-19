export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // -----------------------------
    // 1. Función para verificar sesión
    // -----------------------------
    function isAuthenticated(request) {
      const cookie = request.headers.get("Cookie") || "";
      return cookie.includes("session=");
    }

    // -----------------------------
    // 2. LOGIN ADMIN (POST)
    // -----------------------------
    if (path === "/admin/login" && request.method === "POST") {
      const { password } = await request.json();

      if (password === env.ADMIN_PASSWORD) {
        const sessionId = crypto.randomUUID();

        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": `session=${sessionId}; HttpOnly; Secure; Path=/; Max-Age=86400`,
          },
        });
      }

      return new Response(JSON.stringify({ ok: false }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // -----------------------------
    // 3. PROTEGER TODAS LAS RUTAS /admin/*
    // -----------------------------
    if (path.startsWith("/admin") && path !== "/admin/login") {
      if (!isAuthenticated(request)) {
        return new Response("No autorizado", { status: 401 });
      }
    }

    // -----------------------------
    // 4. SUBIR FOTO (POST /upload)
    // -----------------------------
    if (path === "/upload" && request.method === "POST") {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file) {
        return new Response("No file", { status: 400 });
      }

      const key = `${Date.now()}-${file.name}`;
      await env.BODA_BUCKET.put(key, file.stream());

      await env.DB.prepare("INSERT INTO fotos (nombre, aprobada) VALUES (?, ?)")
        .bind(key, 0)
        .run();

      return new Response(JSON.stringify({ ok: true, key }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // -----------------------------
    // 5. LISTAR FOTOS APROBADAS (GET /fotos-aprobadas)
    // -----------------------------
    if (path === "/fotos-aprobadas" && request.method === "GET") {
      const result = await env.DB.prepare(
        "SELECT nombre FROM fotos WHERE aprobada = 1",
      ).all();

      return new Response(JSON.stringify(result.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // -----------------------------
    // 6. SERVIR FOTO (GET /foto/:key)
    // -----------------------------
    if (path.startsWith("/foto/") && request.method === "GET") {
      const key = path.replace("/foto/", "");
      const object = await env.BODA_BUCKET.get(key);

      if (!object) return new Response("Not found", { status: 404 });

      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType || "image/jpeg",
        },
      });
    }

    // -----------------------------
    // 7. ADMIN: LISTAR TODAS LAS FOTOS
    // -----------------------------
    if (path === "/admin/fotos" && request.method === "GET") {
      const result = await env.DB.prepare("SELECT * FROM fotos").all();

      return new Response(JSON.stringify(result.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // -----------------------------
    // 8. ADMIN: ELIMINAR FOTO
    // -----------------------------
    if (path.startsWith("/admin/eliminar/") && request.method === "GET") {
      const id = path.split("/").pop();

      const foto = await env.DB.prepare("SELECT nombre FROM fotos WHERE id = ?")
        .bind(id)
        .first();

      if (!foto) return new Response("Not found", { status: 404 });

      await env.BODA_BUCKET.delete(foto.nombre);

      await env.DB.prepare("DELETE FROM fotos WHERE id = ?").bind(id).run();

      return new Response("OK");
    }

    // -----------------------------
    // 9. SI NO COINCIDE NINGUNA RUTA
    // -----------------------------
    return new Response("Not found", { status: 404 });
  },
};
