"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { solicitarRegistro, type EstadoSolicitud } from "@/acciones/negocios";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";
import { IconoConversacion } from "@/components/ui/iconos";

const inicial: EstadoSolicitud = { estado: "inicio" };

function Campo({ id, etiqueta, error, ayuda, children }: { id: string; etiqueta: string; error?: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p id={`${id}-aviso`} className="m-0 text-sm leading-5 text-error">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-aviso`} className={`m-0 ${claseAyuda}`}>
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}

/** Formulario "Registra tu negocio" (maqueta Registro). Al enviarse, ofrece avisar por WhatsApp. */
export function FormRegistro({ categorias, avisoWhatsApp }: { categorias: { slug: string; nombre: string }[]; avisoWhatsApp: string }) {
  const [estado, accion, enviando] = useActionState(solicitarRegistro, inicial);
  const e = estado.errores ?? {};
  const v = estado.valores ?? {};
  const a11y = (campo: keyof typeof e) => ({ "aria-invalid": e[campo] ? true : undefined, "aria-describedby": `r-${campo}-aviso` });

  if (estado.estado === "ok") {
    const texto = `Hola, acabo de enviar la solicitud de mi negocio "${estado.negocio}" en Mi Lindo Ecuador.`;
    return (
      <div role="status" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
        <h2 className="m-0 text-xl leading-[26px] font-semibold">¡Solicitud enviada!</h2>
        <p className="m-0 text-rio-suave">
          Recibimos los datos de <b className="text-rio">{estado.negocio}</b>. Revisamos cada solicitud a mano y te escribimos por WhatsApp
          cuando tu ficha esté lista.
        </p>
        <a
          href={`https://wa.me/${avisoWhatsApp}?text=${encodeURIComponent(texto)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={clasesBoton("whatsapp", "normal", "justify-self-start")}
        >
          <IconoConversacion />
          Avisar por WhatsApp (opcional)
        </a>
      </div>
    );
  }

  return (
    <form action={accion} noValidate aria-labelledby="t-form" className="grid gap-5 rounded-xl border border-linea bg-papel-alto p-6">
      <h2 id="t-form" className="m-0 text-xl leading-[26px] font-semibold">
        Datos del negocio
      </h2>
      <Campo id="r-negocio" etiqueta="Nombre del negocio" error={e.negocio}>
        <input id="r-negocio" name="negocio" required maxLength={120} defaultValue={v.negocio} placeholder="Ej.: Encebollados El Puerto" className={claseEntrada} {...a11y("negocio")} />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="r-categoria" etiqueta="Categoría" error={e.categoria}>
          <select id="r-categoria" name="categoria" required defaultValue={v.categoria ?? categorias[0]?.slug} className={`mle-select ${claseEntrada} pr-10`} {...a11y("categoria")}>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="r-sector" etiqueta="Sector" error={e.sector}>
          <input id="r-sector" name="sector" maxLength={80} defaultValue={v.sector} placeholder="Ej.: Urdesa, Centro, Alborada" className={claseEntrada} {...a11y("sector")} />
        </Campo>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="r-contacto" etiqueta="Tu nombre" error={e.contacto}>
          <input id="r-contacto" name="contacto" required maxLength={80} autoComplete="name" defaultValue={v.contacto} className={claseEntrada} {...a11y("contacto")} />
        </Campo>
        <Campo id="r-whatsapp" etiqueta="WhatsApp del negocio" error={e.whatsapp} ayuda="Los clientes te escribirán a este número.">
          <div className="flex">
            <span className="grid place-items-center rounded-l-sm border border-r-0 border-linea-fuerte bg-papel px-3 font-medium text-rio-suave">+593</span>
            <input
              id="r-whatsapp"
              name="whatsapp"
              required
              inputMode="tel"
              autoComplete="tel-national"
              maxLength={20}
              defaultValue={v.whatsapp}
              placeholder="99 123 4567"
              className={`${claseEntrada} rounded-l-none`}
              {...a11y("whatsapp")}
            />
          </div>
        </Campo>
      </div>
      <Campo id="r-descripcion" etiqueta="¿Qué ofreces?" error={e.descripcion}>
        <textarea
          id="r-descripcion"
          name="descripcion"
          rows={4}
          maxLength={1000}
          defaultValue={v.descripcion}
          placeholder="Cuéntale a la gente qué te hace especial"
          className={`${claseEntrada} min-h-[120px] resize-y`}
          {...a11y("descripcion")}
        />
      </Campo>
      <Captcha reiniciar={estado} />
      <div className="grid gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-[22px]">
          <input type="checkbox" name="terminos" required defaultChecked={v.terminos === "on"} className="mt-0.5 size-5 flex-none accent-celeste-tinta" {...a11y("terminos")} />
          <span>
            Acepto los <Link href="/legal/terminos">términos</Link> y la <Link href="/legal/privacidad">política de privacidad</Link>.
          </span>
        </label>
        {e.terminos && (
          <p id="r-terminos-aviso" className="m-0 text-sm leading-5 text-error">
            {e.terminos}
          </p>
        )}
      </div>
      {estado.estado === "error" && (
        <p role="alert" className="m-0 text-sm leading-5 font-semibold text-error">
          {estado.mensaje}
        </p>
      )}
      <button type="submit" disabled={enviando} className={clasesBoton("principal")}>
        {enviando ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
