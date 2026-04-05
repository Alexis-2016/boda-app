import { NextResponse } from "next/server";

const PASSWORD = "1989Spain"; // mismo PIN

export async function middleware(request) {
  if (request.method === "POST") {
    const formData = await request.formData();
    const password = formData.get("password");

    if (password === PASSWORD) {
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.set("auth", PASSWORD);
      return response;
    }

    return new NextResponse("Contraseña incorrecta", { status: 401 });
  }

  return NextResponse.next();
}
