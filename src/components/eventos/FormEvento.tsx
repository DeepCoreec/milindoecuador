"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { editarEvento, pedirSubidaAfiche, publicarEvento, type EstadoEvento } from "@/acciones/eventos";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";
import { aHoraLocal, LISTA_TIPOS, TIPOS_EVENTO } from "@/lib/eventos";
import { urlPublicaAfiche } from "@/lib/fotos";
import { prepararFoto } from "@/lib/imagen";
import { crearClienteSubidas } from "@/lib/supabase/client";
import type { CampoEvento } from "@/lib/validacion/eventos";

const inicial: EstadoEvento = { estado: "inicio" };

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

/** Valores del formulario a partir de un evento guardado (para editarlo). */
export type ValoresEvento = Partial<Record<CampoEvento, string>> & { id?: string; aficheSrc?: string };

/**
 * Formulario para publicar o editar un evento (versión 5, fase 22). El afiche se achica en el navegador (sin datos
 * GPS) y se sube con un permiso de un solo uso antes de enviar el resto.
 */
export function FormEvento({ modo, evento }: { modo: "nuevo" | "editar"; evento?: ValoresEvento }) {
  const [estado, accion, enviando] = useActionState(modo === "nuevo" ? publicarEvento : editarEvento, inicial);
  const [subiendo, setSubiendo] = useState(false);
  const [avisoAfiche, setAvisoAfiche] = useState<string | null>(null);
  const v: ValoresEvento = estado.valores ?? evento ?? {};
  const e = { ...estado.errores, ...(avisoAfiche ? { afiche: avisoAfiche } : {}) };
  const [gratis, setGratis] = useState(v.gratis !== undefined ? v.gratis === "on" : true);
  const [enLinea, setEnLinea] = useState(v.enLinea === "on");
  const [afiche, setAfiche] = useState(v.afiche ?? "");
  const urlBase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const vistaAfiche = afiche ? (afiche === evento?.afiche && evento.aficheSrc ? evento.aficheSrc : urlPublicaAfiche(urlBase, afiche)) : null;
  const a11y = (campo: CampoEvento) => ({ "aria-invalid": e[campo] ? true : undefined, "aria-describedby": `ev-${campo}-aviso` });
  const ahora = aHoraLocal(new Date());

  if (estado.estado === "ok" && modo === "nuevo" && estado.ruta) {
    return (
      <div role="status" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
        <h2 className="m-0 text-xl leading-[26px] font-semibold">¡Tu evento ya está publicado!</h2>
        <p className="m-0 text-rio-suave">Ya se ve en la guía. Se borra solo al día siguiente de su fecha de fin. Puedes cambiarlo o borrarlo desde «Mis eventos».</p>
        <div className="flex flex-wrap gap-3">
          <Link href={estado.ruta} className={clasesBoton("principal")}>
            Ver mi evento
          </Link>
          <Link href="/cuenta/eventos" className={clasesBoton("secundario")}>
            Mis eventos
          </Link>
        </div>
      </div>
    );
  }

  async function enviar(datos: FormData) {
    setAvisoAfiche(null);
    const archivo = datos.get("archivo");
    datos.delete("archivo");
    if (archivo instanceof File && archivo.size > 0) {
      setSubiendo(true);
      try {
        const { foto, formato } = await prepararFoto(archivo);
        const permiso = await pedirSubidaAfiche(formato);
        if ("error" in permiso) throw new Error(permiso.error);
        const { error } = await crearClienteSubidas().storage.from("afiches-eventos").uploadToSignedUrl(permiso.camino, permiso.token, foto, { contentType: foto.type });
        if (error) throw new Error("No se pudo subir el afiche. Revisa tu conexión e inténtalo de nuevo.");
        datos.set("afiche", permiso.camino);
        setAfiche(permiso.camino);
      } catch (err) {
        setSubiendo(false);
        setAvisoAfiche(err instanceof Error ? err.message : "No se pudo subir el afiche");
        return;
      }
      setSubiendo(false);
    }
    accion(datos);
  }

  const ocupado = subiendo || enviando;
  return (
    <form key={estado.intento ?? 0} action={enviar} noValidate aria-labelledby="t-form-evento" className="grid gap-5 rounded-xl border border-linea bg-papel-alto p-6">
      <h2 id="t-form-evento" className="m-0 text-xl leading-[26px] font-semibold">
        {modo === "nuevo" ? "Datos del evento" : "Cambiar el evento"}
      </h2>
      {evento?.id && <input type="hidden" name="evento" value={evento.id} />}

      <Campo id="ev-titulo" etiqueta="Nombre del evento" error={e.titulo}>
        <input id="ev-titulo" name="titulo" required maxLength={120} defaultValue={v.titulo} placeholder="Ej.: Feria del libro en el Malecón" className={claseEntrada} {...a11y("titulo")} />
      </Campo>
      <Campo id="ev-tipo" etiqueta="Tipo de evento" error={e.tipo}>
        <select id="ev-tipo" name="tipo" required defaultValue={v.tipo ?? "concierto"} className={`mle-select ${claseEntrada} pr-10`} {...a11y("tipo")}>
          {LISTA_TIPOS.map((t) => (
            <option key={t} value={t}>
              {TIPOS_EVENTO[t]}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="ev-descripcion" etiqueta="¿De qué se trata?" error={e.descripcion} ayuda="Todo lo que la gente necesita saber: programa, artistas, qué llevar. Sin teléfonos ni enlaces (tienen su campo abajo).">
        <textarea id="ev-descripcion" name="descripcion" required rows={6} maxLength={3000} defaultValue={v.descripcion} className={`${claseEntrada} min-h-[160px] resize-y`} {...a11y("descripcion")} />
      </Campo>

      <fieldset className="m-0 grid gap-5 border-0 p-0">
        <legend className="mb-3 p-0 text-base font-semibold">¿Cuándo?</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="ev-inicio" etiqueta="Empieza" error={e.inicio} ayuda="Hora de Guayaquil">
            <input id="ev-inicio" name="inicio" type="datetime-local" required min={modo === "nuevo" ? ahora.slice(0, 11) + "00:00" : undefined} defaultValue={v.inicio} className={claseEntrada} {...a11y("inicio")} />
          </Campo>
          <Campo id="ev-fin" etiqueta="Termina" error={e.fin} ayuda="Al día siguiente de esta fecha, el evento se borra solo.">
            <input id="ev-fin" name="fin" type="datetime-local" required defaultValue={v.fin} className={claseEntrada} {...a11y("fin")} />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="m-0 grid gap-5 border-0 p-0">
        <legend className="mb-3 p-0 text-base font-semibold">¿Dónde?</legend>
        <label className="flex cursor-pointer items-center gap-3 text-[15px]">
          <input type="checkbox" name="enLinea" checked={enLinea} onChange={(x) => setEnLinea(x.target.checked)} className="size-5 flex-none accent-celeste-tinta" />
          Es en línea (por internet)
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="ev-lugar" etiqueta={enLinea ? "Plataforma (opcional)" : "Lugar"} error={e.lugar}>
            <input id="ev-lugar" name="lugar" maxLength={120} defaultValue={v.lugar} placeholder={enLinea ? "Ej.: Zoom, YouTube" : "Ej.: Malecón 2000, Plaza Cívica"} className={claseEntrada} {...a11y("lugar")} />
          </Campo>
          {!enLinea && (
            <Campo id="ev-direccion" etiqueta="Dirección (opcional)" error={e.direccion}>
              <input id="ev-direccion" name="direccion" maxLength={200} defaultValue={v.direccion} placeholder="Ej.: Av. Malecón y 10 de Agosto" className={claseEntrada} {...a11y("direccion")} />
            </Campo>
          )}
        </div>
        {!enLinea && (
          <Campo id="ev-ubicacion" etiqueta="Ubicación en Google Maps (opcional)" error={e.ubicacion} ayuda="En Google Maps toca «Compartir», copia el enlace y pégalo aquí. Así salen «Cómo llegar» y el mapa.">
            <input id="ev-ubicacion" name="ubicacion" maxLength={300} defaultValue={v.ubicacion} placeholder="https://maps.app.goo.gl/…" className={claseEntrada} {...a11y("ubicacion")} />
          </Campo>
        )}
      </fieldset>

      <fieldset className="m-0 grid gap-5 border-0 p-0">
        <legend className="mb-3 p-0 text-base font-semibold">Entrada</legend>
        <label className="flex cursor-pointer items-center gap-3 text-[15px]">
          <input type="checkbox" name="gratis" checked={gratis} onChange={(x) => setGratis(x.target.checked)} className="size-5 flex-none accent-celeste-tinta" />
          Es gratis
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          {!gratis && (
            <Campo id="ev-precio" etiqueta="Precio en dólares" error={e.precio} ayuda="Si hay varios precios, pon el más bajo y explica en la descripción.">
              <input id="ev-precio" name="precio" inputMode="decimal" maxLength={10} defaultValue={v.precio} placeholder="Ej.: 10" className={claseEntrada} {...a11y("precio")} />
            </Campo>
          )}
          <Campo id="ev-edad" etiqueta="Edad mínima (opcional)" error={e.edad}>
            <input id="ev-edad" name="edad" inputMode="numeric" maxLength={2} defaultValue={v.edad} placeholder="Ej.: 18" className={claseEntrada} {...a11y("edad")} />
          </Campo>
        </div>
        <Campo id="ev-entradas" etiqueta="Enlace para comprar entradas (opcional)" error={e.entradas}>
          <input id="ev-entradas" name="entradas" type="url" maxLength={300} defaultValue={v.entradas} placeholder="https://…" className={claseEntrada} {...a11y("entradas")} />
        </Campo>
      </fieldset>

      <fieldset className="m-0 grid gap-5 border-0 p-0">
        <legend className="mb-3 p-0 text-base font-semibold">Quién lo organiza</legend>
        <Campo id="ev-organizador" etiqueta="Organizador" error={e.organizador}>
          <input id="ev-organizador" name="organizador" required maxLength={120} defaultValue={v.organizador} placeholder="Ej.: Biblioteca Municipal" className={claseEntrada} {...a11y("organizador")} />
        </Campo>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="ev-whatsapp" etiqueta="WhatsApp para dudas (opcional)" error={e.whatsapp} ayuda="Se muestra en el evento.">
            <input id="ev-whatsapp" name="whatsapp" inputMode="tel" maxLength={20} defaultValue={v.whatsapp} placeholder="099 123 4567" className={claseEntrada} {...a11y("whatsapp")} />
          </Campo>
          <Campo id="ev-web" etiqueta={enLinea ? "Enlace para conectarse (opcional)" : "Página o red social (opcional)"} error={e.web}>
            <input id="ev-web" name="web" type="url" maxLength={300} defaultValue={v.web} placeholder="https://…" className={claseEntrada} {...a11y("web")} />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="m-0 grid gap-4 border-0 p-0">
        <legend className="mb-3 p-0 text-base font-semibold">Afiche o foto (opcional)</legend>
        <input type="hidden" name="afiche" value={afiche} />
        {vistaAfiche && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa chica del afiche ya subido */}
            <img src={vistaAfiche} alt="" className="h-24 w-20 rounded-sm object-cover" />
            <button type="button" onClick={() => setAfiche("")} className={clasesBoton("texto")}>
              Quitar afiche
            </button>
          </div>
        )}
        <Campo id="ev-archivo" etiqueta={vistaAfiche ? "Cambiar por otro" : "Elegir imagen"} error={e.afiche} ayuda="JPG, PNG o WebP. La achicamos y le quitamos la ubicación GPS antes de subirla.">
          <input id="ev-archivo" name="archivo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" {...a11y("afiche")} />
        </Campo>
        <Campo id="ev-aficheAlt" etiqueta="¿Qué se ve en el afiche?" error={e.aficheAlt} ayuda="Para quienes no pueden ver la imagen. Ej.: Afiche con la fecha y los artistas.">
          <input id="ev-aficheAlt" name="aficheAlt" maxLength={200} defaultValue={v.aficheAlt} className={claseEntrada} {...a11y("aficheAlt")} />
        </Campo>
      </fieldset>

      {modo === "nuevo" && (
        <>
          <Captcha reiniciar={estado} />
          <div className="grid gap-1.5">
            <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-[22px]">
              <input type="checkbox" name="terminos" required defaultChecked={v.terminos === "on"} className="mt-0.5 size-5 flex-none accent-celeste-tinta" {...a11y("terminos")} />
              <span>
                Acepto los <Link href="/legal/terminos">términos</Link> y la <Link href="/legal/privacidad">política de privacidad</Link>. El evento es real y tengo permiso para publicarlo.
              </span>
            </label>
            {e.terminos && (
              <p id="ev-terminos-aviso" className="m-0 text-sm leading-5 text-error">
                {e.terminos}
              </p>
            )}
          </div>
        </>
      )}

      {estado.estado !== "inicio" && estado.mensaje && (
        <p role={estado.estado === "error" ? "alert" : "status"} className={`m-0 text-sm leading-5 font-semibold ${estado.estado === "error" ? "text-error" : "text-exito"}`}>
          {estado.mensaje}
          {estado.estado === "ok" && estado.ruta && (
            <>
              {" "}
              <Link href={estado.ruta}>Ver el evento</Link>
            </>
          )}
        </p>
      )}
      <button type="submit" disabled={ocupado} className={clasesBoton("principal", "normal", "justify-self-start")}>
        {subiendo ? "Subiendo el afiche…" : enviando ? (modo === "nuevo" ? "Publicando…" : "Guardando…") : modo === "nuevo" ? "Publicar evento" : "Guardar cambios"}
      </button>
    </form>
  );
}
