"use client";

import { useState } from "react";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";

type Props = {
  id: string;
  etiqueta: string;
  ayuda?: string;
  /** Mensaje de error de este campo (si lo hay). */
  error?: string;
  valor?: string;
};

function Aviso({ id, error, ayuda }: { id: string; error?: string; ayuda?: string }) {
  if (error)
    return (
      <p id={`${id}-aviso`} role="alert" className="m-0 text-sm leading-5 text-error">
        {error}
      </p>
    );
  if (ayuda)
    return (
      <p id={`${id}-aviso`} className={`m-0 ${claseAyuda}`}>
        {ayuda}
      </p>
    );
  return null;
}

export function CampoCorreo({ id, etiqueta, ayuda, error, valor }: Props) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      <input
        id={id}
        name="correo"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        maxLength={254}
        defaultValue={valor}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? `${id}-aviso` : undefined}
        className={claseEntrada}
      />
      <Aviso id={id} error={error} ayuda={ayuda} />
    </div>
  );
}

/**
 * Campo de contraseña con botón "Mostrar" (en el celular es fácil equivocarse escribiendo).
 * `nueva` le dice al navegador que proponga y guarde una contraseña nueva.
 */
export function CampoContrasena({ id, etiqueta, ayuda, error, nombre = "contrasena", nueva = false }: Props & { nombre?: string; nueva?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          name={nombre}
          type={visible ? "text" : "password"}
          autoComplete={nueva ? "new-password" : "current-password"}
          required
          minLength={nueva ? 8 : undefined}
          maxLength={72}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? `${id}-aviso` : undefined}
          className={`${claseEntrada} pr-24`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-controls={id}
          aria-pressed={visible}
          className="absolute inset-y-1 right-1 rounded-sm px-3 text-sm font-semibold text-rio-suave hover:text-rio"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <Aviso id={id} error={error} ayuda={ayuda} />
    </div>
  );
}

/** Caja de "Revisa tu correo" que se muestra después de enviar un enlace. */
export function AvisoCorreo({ titulo, correo, children }: { titulo: string; correo?: string; children: React.ReactNode }) {
  return (
    <div role="status" className="grid gap-2 rounded-xl border border-linea bg-celeste-suave p-5">
      <p className="m-0 font-semibold">{titulo}</p>
      <p className="m-0 text-rio-suave">
        {correo && (
          <>
            Te escribimos a <b className="text-rio">{correo}</b>.{" "}
          </>
        )}
        {children}
      </p>
    </div>
  );
}
