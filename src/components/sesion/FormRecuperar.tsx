"use client";

import { useActionState } from "react";
import { pedirRecuperacion, type EstadoSesion } from "@/acciones/sesion";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { AvisoCorreo, CampoCorreo } from "./Campos";

const inicial: EstadoSesion = { estado: "inicio" };

/** "Olvidé mi contraseña": manda un enlace para escribir una nueva. */
export function FormRecuperar() {
  const [estado, accion, enviando] = useActionState(pedirRecuperacion, inicial);

  if (estado.estado === "enviado") {
    return (
      <AvisoCorreo titulo="Revisa tu correo" correo={estado.correo}>
        Si ese correo tiene una cuenta, te llegará un enlace para escribir una contraseña nueva. Ábrelo en este mismo teléfono o computadora. Si no aparece,
        mira en la carpeta de correo no deseado.
      </AvisoCorreo>
    );
  }

  const error = estado.estado === "error" ? estado.mensaje : undefined;
  return (
    <form action={accion} className="grid gap-4" noValidate>
      <CampoCorreo id="correo" etiqueta="Tu correo" error={error} valor={estado.correo} ayuda="Te mandamos un enlace para crear una contraseña nueva." />
      <Captcha reiniciar={estado} />
      <button type="submit" disabled={enviando} className={clasesBoton("principal")}>
        {enviando ? "Enviando…" : "Enviarme el enlace"}
      </button>
    </form>
  );
}
