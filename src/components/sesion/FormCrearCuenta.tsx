"use client";

import { useActionState } from "react";
import { crearCuenta, type EstadoSesion } from "@/acciones/sesion";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { AvisoCorreo, CampoContrasena, CampoCorreo } from "./Campos";

const inicial: EstadoSesion = { estado: "inicio" };

/** Crear cuenta con correo y contraseña. Después pide confirmar el correo con el enlace que llega. */
export function FormCrearCuenta({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState(crearCuenta, inicial);

  if (estado.estado === "enviado") {
    return (
      <AvisoCorreo titulo="Revisa tu correo para confirmar tu cuenta" correo={estado.correo}>
        Abre el enlace del correo para activar tu cuenta y después entra con tu correo y contraseña. Si no aparece, mira en la carpeta de correo no deseado.
      </AvisoCorreo>
    );
  }

  const error = estado.estado === "error" ? estado.mensaje : undefined;
  const de = (c: EstadoSesion["campo"]) => (estado.campo === c ? error : undefined);
  const general = error && !estado.campo ? error : undefined;

  return (
    <form action={accion} className="grid gap-4" noValidate>
      <input type="hidden" name="siguiente" value={siguiente} />
      <CampoCorreo id="correo" etiqueta="Tu correo" error={de("correo")} valor={estado.correo} />
      <CampoContrasena id="contrasena" etiqueta="Contraseña" nueva error={de("contrasena")} ayuda="Mínimo 8 caracteres. Mejor si es una frase que solo tú conozcas." />
      <CampoContrasena id="repetir" nombre="repetir" etiqueta="Repite la contraseña" nueva error={de("repetir")} />
      {general && (
        <p role="alert" className="m-0 text-sm leading-5 text-error">
          {general}
        </p>
      )}
      <Captcha reiniciar={estado} />
      <button type="submit" disabled={enviando} className={clasesBoton("principal")}>
        {enviando ? "Creando…" : "Crear mi cuenta"}
      </button>
    </form>
  );
}
