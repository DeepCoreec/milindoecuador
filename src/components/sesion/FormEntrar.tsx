"use client";

import { useActionState } from "react";
import { entrarConCorreo, type EstadoEntrar } from "@/acciones/sesion";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";

const inicial: EstadoEntrar = { estado: "inicio" };

/** Pide el correo y envía el enlace mágico. Después muestra a qué correo se envió. */
export function FormEntrar({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState(entrarConCorreo, inicial);

  if (estado.estado === "enviado") {
    return (
      <div role="status" className="grid gap-2 rounded-xl border border-linea bg-celeste-suave p-5">
        <p className="m-0 font-semibold">Revisa tu correo</p>
        <p className="m-0 text-rio-suave">
          Te enviamos un enlace a <b className="text-rio">{estado.correo}</b>. Ábrelo en este mismo teléfono o computadora para entrar. Si no
          aparece, mira en la carpeta de correo no deseado.
        </p>
      </div>
    );
  }

  const hayError = estado.estado === "error";
  return (
    <form action={accion} className="grid gap-4" noValidate>
      <input type="hidden" name="siguiente" value={siguiente} />
      <div className="grid gap-1.5">
        <label htmlFor="correo" className={claseEtiqueta}>
          Tu correo
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          defaultValue={estado.correo}
          aria-invalid={hayError || undefined}
          aria-describedby={hayError ? "correo-error" : "correo-ayuda"}
          className={claseEntrada}
        />
        {hayError ? (
          <p id="correo-error" role="alert" className="m-0 text-sm leading-5 text-error">
            {estado.mensaje}
          </p>
        ) : (
          <p id="correo-ayuda" className={`m-0 ${claseAyuda}`}>
            Te mandamos un enlace para entrar. Sin contraseñas.
          </p>
        )}
      </div>
      <Captcha reiniciar={estado} />
      <button type="submit" disabled={enviando} className={clasesBoton("principal")}>
        {enviando ? "Enviando…" : "Enviarme el enlace"}
      </button>
    </form>
  );
}
