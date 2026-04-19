export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ------------------------------
    // SUBIR FOTO
    // ------------------------------
    if (path === "/upload" && request.method === "POST") {
      const form = await request.formData();
      const file = form.get("foto");
      const usuario = form.get("usuario") || "Invitado";
      const mensaje = form.get("mensaje") || "";

      if (!file) {
        return new Response("No se envió ninguna foto", { status: 400 });
      }

      const key = `${Date.now()}-${file.name}`;

      // Guardar en R2
      await env.BODA_BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
      });

      // Guardar en D1 (APROBADA POR DEFECTO)
      await env.DB.prepare(
        `INSERT INTO fotos_proyector (nombre_usuario, r2_key, size_bytes, tipo_archivo, mensaje, aprobada)
         VALUES (?, ?, ?, ?, ?, 1)`,
      )
        .bind(usuario, key, file.size, file.type, mensaje)
        .run();

      return new Response("OK", { status: 200 });
    }

    // ------------------------------
    // OBTENER TODAS LAS FOTOS (SIN APROBACIÓN)
    // ------------------------------
    if (path === "/fotos-aprobadas") {
      const result = await env.DB.prepare(
        `SELECT id, r2_key, nombre_usuario, mensaje
         FROM fotos_proyector
         ORDER BY id DESC`,
      ).all();

      const fotos = result.results.map((f) => ({
        id: f.id,
        url: `https://boda-images.alexismerinodev.com/foto/${f.r2_key}`,
        nombre_usuario: f.nombre_usuario,
        mensaje: f.mensaje,
      }));

      return new Response(JSON.stringify(fotos), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ------------------------------
    // SERVIR FOTO DESDE R2
    // ------------------------------
    if (path.startsWith("/foto/")) {
      const key = path.replace("/foto/", "");
      const obj = await env.BODA_BUCKET.get(key);

      if (!obj) return new Response("No encontrada", { status: 404 });

      return new Response(obj.body, {
        headers: {
          "Content-Type": obj.httpMetadata?.contentType || "image/jpeg",
        },
      });
    }

    // ------------------------------
    // ADMIN: LISTAR TODAS LAS FOTOS
    // ------------------------------
    if (path === "/admin/fotos") {
      const result = await env.DB.prepare(
        `SELECT id, r2_key, nombre_usuario, mensaje
         FROM fotos_proyector
         ORDER BY id DESC`,
      ).all();

      return new Response(JSON.stringify(result.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ------------------------------
    // ADMIN: ELIMINAR FOTO
    // ------------------------------
    if (path.startsWith("/admin/eliminar/")) {
      const id = path.split("/").pop();

      const foto = await env.DB.prepare(
        `SELECT r2_key FROM fotos_proyector WHERE id = ?`,
      )
        .bind(id)
        .first();

      if (!foto) return new Response("No existe", { status: 404 });

      // Borrar de R2
      await env.BODA_BUCKET.delete(foto.r2_key);

      // Borrar de D1
      await env.DB.prepare(`DELETE FROM fotos_proyector WHERE id = ?`)
        .bind(id)
        .run();

      return new Response("Eliminada", { status: 200 });
    }
    // ------------------------------
    // ADMIN LOGIN
    // ------------------------------
    if (path === "/admin/login" && request.method === "POST") {
      const body = await request.json();
      const password = body.password;

      // Cambia esta contraseña por la tuya
      const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "1989";

      if (password === ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: false }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
