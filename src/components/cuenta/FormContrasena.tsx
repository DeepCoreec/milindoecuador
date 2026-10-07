"use client";

import { useActionState } from "react";
import { cambiarContrasena, type EstadoSesion } from "@/acciones/sesion";
import { CampoContrasena } from "@/components/sesion/Campos";
import { clasesBoton } from "@/components/ui/Boton";

const inicial: EstadoSesion = { estado: "inicio" };

/** Poner o cambiar la contraseña desde "Mi cuenta". */
export function FormContrasena() {
  const [estado, accion, guardando] = useActionState(cambiarContrasena, inicial);
  const error = estado.estado === "error" ? estado.mensaje : undefined;
  return (
    <form action={accion} className="grid gap-3" noValidate>
      <CampoContrasena
        id="nueva-contrasena"
        etiqueta="Contraseña nueva"
        nueva
        error={estado.campo === "contrasena" || !estado.campo ? error : undefined}
        ayuda="Mínimo 8 caracteres."
      />
      <CampoContrasena id="repetir-contrasena" nombre="repetir" etiqueta="Repite la contraseña nueva" nueva error={estado.campo === "repetir" ? error : undefined} />
      {estado.estado === "ok" && (
        <p role="status" className="m-0 text-sm leading-5 text-rio-suave">
          {estado.mensaje}
        </p>
      )}
      <button type="submit" disabled={guardando} className={clasesBoton("secundario", "chico", "justify-self-start")}>
        {guardando ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
