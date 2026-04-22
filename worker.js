const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ✅ CORS preflight - debe ir PRIMERO
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    function isAuthenticated(request) {
      const cookie = request.headers.get("Cookie") || "";
      return cookie.includes("session=");
    }

    // LOGIN ADMIN
    if (path === "/admin/login" && request.method === "POST") {
      const { password } = await request.json();
      if (password === env.ADMIN_PASSWORD) {
        const sessionId = crypto.randomUUID();
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": `session=${sessionId}; HttpOnly; Secure; Path=/; Max-Age=86400`,
            ...corsHeaders,
          },
        });
      }
      return new Response(JSON.stringify({ ok: false }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // PROTEGER RUTAS ADMIN
    if (path.startsWith("/admin") && path !== "/admin/login") {
      if (!isAuthenticated(request)) {
        return new Response("No autorizado", { status: 401 });
      }
    }

    // ✅ SUBIR FOTO - con key definida y CORS añadido
    if (path === "/upload" && request.method === "POST") {
      const formData = await request.formData();
      const file = formData.get("foto") || formData.get("file");
      const usuario = formData.get("usuario");
      const mensaje = formData.get("mensaje");
      const orientacion = formData.get("orientacion");

      if (!file) {
        return new Response("No file", { status: 400, headers: corsHeaders });
      }

      // ✅ key definida
      const key = `${Date.now()}-${crypto.randomUUID()}.jpg`;

      const arrayBuffer = await file.arrayBuffer();

      await env.BODA_BUCKET.put(key, arrayBuffer, {
        httpMetadata: { contentType: file.type },
      });

      await env.DB.prepare(
        `INSERT INTO fotos_proyector 
          (r2_key, nombre_usuario, mensaje, tipo_archivo, size_bytes, orientacion)
        VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(key, usuario, mensaje, file.type, file.size, orientacion)
        .run();

      return new Response(JSON.stringify({ ok: true, key }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // FOTOS APROBADAS
    if (path === "/fotos-aprobadas" && request.method === "GET") {
      const result = await env.DB.prepare(
        `SELECT id, r2_key, nombre_usuario, mensaje, orientacion
         FROM fotos_proyector ORDER BY creado_en DESC`,
      ).all();
      return new Response(JSON.stringify(result.results), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // SERVIR FOTO
    if (path.startsWith("/foto/") && request.method === "GET") {
      const key = path.replace("/foto/", "");
      const object = await env.BODA_BUCKET.get(key);
      if (!object) return new Response("Not found", { status: 404 });
      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType || "image/jpeg",
          ...corsHeaders,
        },
      });
    }

    // ADMIN: LISTAR FOTOS
    if (path === "/admin/fotos" && request.method === "GET") {
      const result = await env.DB.prepare(
        `SELECT id, r2_key, nombre_usuario, mensaje, tipo_archivo, size_bytes, creado_en
         FROM fotos_proyector ORDER BY creado_en DESC`,
      ).all();
      return new Response(JSON.stringify(result.results), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ADMIN: ELIMINAR FOTO
    if (path.startsWith("/admin/eliminar/") && request.method === "GET") {
      const id = path.split("/").pop();
      const foto = await env.DB.prepare(
        "SELECT r2_key FROM fotos_proyector WHERE id = ?",
      )
        .bind(id)
        .first();
      if (!foto) return new Response("Not found", { status: 404 });
      await env.BODA_BUCKET.delete(foto.r2_key);
      await env.DB.prepare("DELETE FROM fotos_proyector WHERE id = ?")
        .bind(id)
        .run();
      return new Response("OK", { headers: corsHeaders });
    }

    return new Response("Not found", { status: 404 });
  },
};
