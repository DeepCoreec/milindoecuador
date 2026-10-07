"use client";

import Link from "next/link";
import { useActionState } from "react";
import { entrarConContrasena, type EstadoSesion } from "@/acciones/sesion";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { CampoContrasena, CampoCorreo } from "./Campos";

const inicial: EstadoSesion = { estado: "inicio" };

/** Entrar con correo y contraseña. Si sale bien, el servidor lleva a la persona a donde iba. */
export function FormEntrar({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState(entrarConContrasena, inicial);
  const error = estado.estado === "error" ? estado.mensaje : undefined;
  const errorCorreo = estado.campo === "correo" ? error : undefined;
  const errorGeneral = error && estado.campo !== "correo" ? error : undefined;

  return (
    <form action={accion} className="grid gap-4" noValidate>
      <input type="hidden" name="siguiente" value={siguiente} />
      <CampoCorreo id="correo" etiqueta="Tu correo" error={errorCorreo} valor={estado.correo} />
      <CampoContrasena id="contrasena" etiqueta="Contraseña" error={errorGeneral} />
      <Link href={`/recuperar?siguiente=${encodeURIComponent(siguiente)}`} className="justify-self-start text-sm leading-5">
        Olvidé mi contraseña
      </Link>
      <Captcha reiniciar={estado} />
      <button type="submit" disabled={enviando} className={clasesBoton("principal")}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
