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
      console.log([...formData.keys()]);

      const formData = await request.formData();
      const file = formData.get("foto") || formData.get("file"); // Compatibilidad con diferentes nombres de campo
      const usuario = formData.get("usuario");
      const mensaje = formData.get("mensaje");

      if (!file) {
        return new Response("No file", { status: 400 });
      }

      // Convertir File → ArrayBuffer (solución definitiva)
      const arrayBuffer = await file.arrayBuffer();

      // Guardar en R2
      await env.BODA_BUCKET.put(key, arrayBuffer, {
        httpMetadata: { contentType: file.type },
      });

      // Guardar metadatos en D1
      await env.DB.prepare(
        `INSERT INTO fotos_proyector 
          (r2_key, nombre_usuario, mensaje, tipo_archivo, size_bytes)
        VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(key, usuario, mensaje, file.type, file.size)
        .run();

      return new Response(JSON.stringify({ ok: true, key }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // -----------------------------
    // 5. LISTAR TODAS LAS FOTOS (GET /fotos-aprobadas)
    // -----------------------------
    if (path === "/fotos-aprobadas" && request.method === "GET") {
      const result = await env.DB.prepare(
        `SELECT 
            id,
            r2_key,
            nombre_usuario,
            mensaje,
            orientacion
         FROM fotos_proyector
         ORDER BY creado_en DESC`,
      ).all();

      return new Response(JSON.stringify(result.results), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
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
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // -----------------------------
    // 7. ADMIN: LISTAR TODAS LAS FOTOS
    // -----------------------------
    if (path === "/admin/fotos" && request.method === "GET") {
      const result = await env.DB.prepare(
        `SELECT 
            id,
            r2_key,
            nombre_usuario,
            mensaje,
            tipo_archivo,
            size_bytes,
            creado_en
         FROM fotos_proyector
         ORDER BY creado_en DESC`,
      ).all();

      return new Response(JSON.stringify(result.results), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // -----------------------------
    // 8. ADMIN: ELIMINAR FOTO
    // -----------------------------
    if (path.startsWith("/admin/eliminar/") && request.method === "GET") {
      const id = path.split("/").pop();

      const foto = await env.DB.prepare(
        "SELECT r2_key FROM fotos_proyector WHERE id = ?",
      )
        .bind(id)
        .first();

      if (!foto) return new Response("Not found", { status: 404 });

      // Borrar de R2
      await env.BODA_BUCKET.delete(foto.r2_key);

      // Borrar de D1
      await env.DB.prepare("DELETE FROM fotos_proyector WHERE id = ?")
        .bind(id)
        .run();

      return new Response("OK");
    }

    // -----------------------------
    // 9. SI NO COINCIDE NINGUNA RUTA
    // -----------------------------
    return new Response("Not found", { status: 404 });
  },
};
