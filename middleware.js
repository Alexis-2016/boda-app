import { NextResponse } from "next/server";

const PASSWORD = "1989Spain"; // ← cambia esto por tu PIN

export function middleware(request) {
  const url = request.nextUrl;
  const cookie = request.cookies.get("auth");

  // Rutas protegidas
  const protectedPaths = ["/", "/index.html"];

  if (protectedPaths.includes(url.pathname)) {
    // Si ya está autenticado, dejar pasar
    if (cookie?.value === PASSWORD) {
      return NextResponse.next();
    }

    // Si no está autenticado, mostrar formulario
    return new NextResponse(
      `
      <html>
        <body style="font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;">
          <form method="POST">
            <h2>Introduce la contraseña</h2>
            <input name="password" type="password" style="padding:10px; font-size:18px;" />
            <button type="submit" style="padding:10px 20px; font-size:18px;">Entrar</button>
          </form>
        </body>
      </html>
      `,
      { headers: { "content-type": "text/html" } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/index.html"],
};
