import { describe, expect, it } from "vitest";
import { leerEnlace, nombreSitio } from "@/lib/redes";

describe("leerEnlace", () => {
  it("acepta el enlace como lo pega la gente y lo deja en https", () => {
    expect(leerEnlace("instagram", "instagram.com/milindo")).toBe("https://instagram.com/milindo");
    expect(leerEnlace("facebook", "http://www.facebook.com/milindo")).toBe("https://www.facebook.com/milindo");
    expect(leerEnlace("web", "  WWW.MiLindo.ec  ")).toBe("https://www.milindo.ec/");
    expect(leerEnlace("youtube", "https://youtu.be/abc123?si=x")).toBe("https://youtu.be/abc123?si=x");
  });

  it("convierte @usuario en el perfil de la red", () => {
    expect(leerEnlace("instagram", "@milindo")).toBe("https://www.instagram.com/milindo");
    expect(leerEnlace("tiktok", "@mi.lindo_ec")).toBe("https://www.tiktok.com/@mi.lindo_ec");
    expect(leerEnlace("web", "@milindo")).toBe("invalido");
  });

  it("vacío es null", () => {
    expect(leerEnlace("tiktok", "   ")).toBeNull();
  });

  it("rechaza enlaces de otra red o que imitan a la red", () => {
    expect(leerEnlace("facebook", "https://instagram.com/x")).toBe("otra-red");
    expect(leerEnlace("instagram", "https://instagram.com.estafa.ru/x")).toBe("otra-red");
    expect(leerEnlace("instagram", "https://falsoinstagram.com/x")).toBe("otra-red");
    expect(leerEnlace("tiktok", "https://vm.tiktok.com/ZM123/")).toBe("https://vm.tiktok.com/ZM123/");
  });

  it("rechaza lo que no es una página web segura", () => {
    for (const malo of ["javascript:alert(1)", "data:text/html,hola", "https://usuario@facebook.com/x", "https://milindo.ec:8080/", "https://192.168.0.1/", "hola", "https://localhost/"])
      expect(leerEnlace(malo.includes("facebook") ? "facebook" : "web", malo)).toBe("invalido");
  });
});

describe("nombreSitio", () => {
  it("muestra solo el sitio, sin www", () => {
    expect(nombreSitio("https://www.milindo.ec/menu")).toBe("milindo.ec");
  });
});
