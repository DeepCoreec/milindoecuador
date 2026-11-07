"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { pedirSubidaFoto, registrarFotoDueno } from "@/acciones/dueno";
import { prepararFoto } from "@/lib/imagen";
import { crearClienteSubidas } from "@/lib/supabase/client";
import { solicitarRegistro, type EstadoSolicitud } from "@/acciones/negocios";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";
import { IconoConversacion } from "@/components/ui/iconos";
import { ESPECIALIDADES, IDIOMAS } from "@/lib/guias";

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

/** Casillas de una lista fija (idiomas o especialidades del guía). */
function Casillas({ nombre, leyenda, ayuda, opciones, marcadas }: { nombre: string; leyenda: string; ayuda: string; opciones: Record<string, string>; marcadas: string[] }) {
  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0">
      <legend className={`p-0 ${claseEtiqueta}`}>{leyenda}</legend>
      <p className={`m-0 ${claseAyuda}`}>{ayuda}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {Object.entries(opciones).map(([codigo, texto]) => (
          <label key={codigo} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] leading-5">
            <input type="checkbox" name={nombre} value={codigo} defaultChecked={marcadas.includes(codigo)} className="size-5 flex-none accent-celeste-tinta" />
            {texto}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Formulario "Registra tu negocio" (maqueta Registro). Al enviarse, ofrece avisar por WhatsApp. */
export function FormRegistro({ categorias, avisoWhatsApp, categoriaInicial }: { categorias: { slug: string; nombre: string }[]; avisoWhatsApp: string; categoriaInicial?: string }) {
  const [estado, accion, enviando] = useActionState(solicitarRegistro, inicial);
  const e = estado.errores ?? {};
  const v = estado.valores ?? {};
  // Versión 13: si elige "Guías turísticos", el formulario habla de su perfil de guía (no de un negocio)
  const [elegida, setElegida] = useState(v.categoria ?? categoriaInicial ?? categorias[0]?.slug ?? "");
  const guia = (v.categoria ?? elegida) === "guias";
  const a11y = (campo: keyof typeof e) => ({ "aria-invalid": e[campo] ? true : undefined, "aria-describedby": `r-${campo}-aviso` });

  // 2026-11-07 (pedido del usuario: "no hay nada para subir una foto para saber quién es la persona"): el guía elige su
  // foto al registrarse. La ficha se crea primero y la foto se sube enseguida, con el mismo permiso de un solo uso que
  // en «Mi negocio» (el servidor revisa que la ficha sea suya y que el archivo sea de verdad una foto).
  const [foto, setFoto] = useState<File | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [faltaFoto, setFaltaFoto] = useState(false);
  const [subida, setSubida] = useState<"no" | "subiendo" | "lista" | "error">("no");
  const [errorFoto, setErrorFoto] = useState("");
  const subiendoPara = useRef<string | null>(null);

  function elegirFoto(f: File | null) {
    if (f && !["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setErrorFoto("Usa una foto JPG, PNG o WebP.");
      f = null;
    } else setErrorFoto("");
    if (vista) URL.revokeObjectURL(vista);
    setFoto(f);
    setVista(f ? URL.createObjectURL(f) : null);
    setFaltaFoto(false);
  }

  useEffect(() => {
    const ficha = estado.estado === "ok" ? estado.ficha : undefined;
    if (!ficha || !guia || !foto || subiendoPara.current === ficha) return;
    subiendoPara.current = ficha;
    (async () => {
      setSubida("subiendo");
      try {
        const { foto: lista, formato } = await prepararFoto(foto);
        const permiso = await pedirSubidaFoto(ficha, formato);
        if ("error" in permiso) throw new Error(permiso.error);
        const { error } = await crearClienteSubidas().storage.from("fotos-lugares").uploadToSignedUrl(permiso.camino, permiso.token, lista, { contentType: lista.type });
        if (error) throw new Error("No se pudo subir la foto. Revisa tu conexión.");
        const datos = new FormData();
        datos.set("lugar", ficha);
        datos.set("camino", permiso.camino);
        datos.set("alt", `Foto de ${estado.negocio ?? "la guía"}`.slice(0, 160));
        const r = await registrarFotoDueno({ estado: "inicio" }, datos);
        if (r.estado !== "ok") throw new Error(r.mensaje ?? "No se pudo guardar la foto.");
        setSubida("lista");
      } catch (err) {
        setErrorFoto(err instanceof Error ? err.message : "No se pudo subir la foto.");
        setSubida("error");
      }
    })();
  }, [estado, guia, foto]);

  if (estado.estado === "ok" && estado.ficha) {
    return (
      <div role="status" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
        <h2 className="m-0 text-xl leading-[26px] font-semibold">{guia ? "¡Tu perfil de guía ya está creado!" : "¡Tu negocio ya está registrado!"}</h2>
        <p className="m-0 text-rio-suave">
          {guia ? (
            <>
              Creamos la ficha de <b className="text-rio">{estado.negocio}</b>. En «Mi negocio» revisas tu perfil, armas tus recorridos y lo
              publicas cuando quieras.
            </>
          ) : (
            <>
              Creamos la ficha de <b className="text-rio">{estado.negocio}</b>. Complétala con fotos, horario y ubicación, y publícala cuando quieras: se
              ve en la guía al instante.
            </>
          )}
        </p>
        {guia && subida === "subiendo" && <p className="m-0 font-semibold">Subiendo tu foto…</p>}
        {guia && subida === "lista" && <p className="m-0 font-semibold text-exito">✓ Tu foto ya está en tu perfil.</p>}
        {guia && subida === "error" && (
          <p role="alert" className="m-0 text-error">
            Tu perfil se creó, pero la foto no se pudo subir ({errorFoto}). Súbela desde «Mi negocio».
          </p>
        )}
        <Link href={`/mi-negocio/${estado.ficha}`} className={clasesBoton("principal", "normal", "justify-self-start")} aria-disabled={subida === "subiendo"}>
          {guia ? "Completar mi perfil de guía" : "Completar mi ficha"}
        </Link>
      </div>
    );
  }

  if (estado.estado === "ok") {
    const texto = `Hola, acabo de enviar la solicitud de mi negocio "${estado.negocio}" en Mi Lindo Ecuador.`;
    return (
      <div role="status" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
        <h2 className="m-0 text-xl leading-[26px] font-semibold">¡Solicitud enviada!</h2>
        <p className="m-0 text-rio-suave">
          Recibimos los datos de <b className="text-rio">{estado.negocio}</b>.{" "}
          {estado.mensaje ?? "Revisamos tu solicitud a mano y te escribimos por WhatsApp cuando tu ficha esté lista."}
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
    <form
      key={estado.intento ?? 0}
      action={accion}
      onSubmit={(ev) => {
        // El guía tiene que poner su foto (así los turistas saben con quién van)
        if (guia && !foto) {
          ev.preventDefault();
          setFaltaFoto(true);
          document.getElementById("r-foto")?.focus();
        }
      }}
      noValidate aria-labelledby="t-form" className="grid gap-5 rounded-xl border border-linea bg-papel-alto p-6">
      <h2 id="t-form" className="m-0 text-xl leading-[26px] font-semibold">
        {guia ? "Tus datos de guía" : "Datos del negocio"}
      </h2>
      <Campo id="r-negocio" etiqueta={guia ? "Nombre con el que te van a encontrar" : "Nombre del negocio"} error={e.negocio}>
        <input
          id="r-negocio"
          name="negocio"
          required
          maxLength={120}
          defaultValue={v.negocio}
          placeholder={guia ? "Ej.: Ana Torres, guía de Guayaquil" : "Ej.: Encebollados El Puerto"}
          className={claseEntrada}
          {...a11y("negocio")}
        />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="r-categoria" etiqueta="Categoría" error={e.categoria}>
          <select id="r-categoria" name="categoria" required value={elegida} onChange={(ev) => setElegida(ev.target.value)} className={`mle-select ${claseEntrada} pr-10`} {...a11y("categoria")}>
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
        {/* El guía es una persona: su nombre de contacto es el mismo con el que lo encuentran (lo pone el servidor) */}
        {!guia && (
          <Campo id="r-contacto" etiqueta="Tu nombre" error={e.contacto}>
            <input id="r-contacto" name="contacto" required maxLength={80} autoComplete="name" defaultValue={v.contacto} className={claseEntrada} {...a11y("contacto")} />
          </Campo>
        )}
        <Campo id="r-whatsapp" etiqueta={guia ? "Tu WhatsApp" : "WhatsApp del negocio"} error={e.whatsapp} ayuda={guia ? "Los turistas te escribirán a este número para pedirte un recorrido." : "Los clientes te escribirán a este número."}>
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
      <Campo id="r-descripcion" etiqueta={guia ? "Preséntate" : "¿Qué ofreces?"} error={e.descripcion}>
        <textarea
          id="r-descripcion"
          name="descripcion"
          rows={4}
          required
          minLength={40}
          maxLength={1000}
          defaultValue={v.descripcion}
          placeholder={
            guia
              ? "Cuéntale a la gente quién eres, cuánto tiempo llevas guiando y qué recorridos haces. Si tienes una agencia de turismo, cuéntalo aquí (al menos 40 letras)"
              : "Cuéntale a la gente qué te hace especial: qué vendes, tu especialidad, para quién es (al menos 40 letras)"
          }
          className={`${claseEntrada} min-h-[120px] resize-y`}
          {...a11y("descripcion")}
        />
      </Campo>
      {guia && (
        <div className="grid gap-5 border-t border-linea pt-5">
          <h3 className="m-0 text-lg leading-6 font-semibold">Tu perfil de guía</h3>
          <div className="grid gap-2">
            <label htmlFor="r-foto" className={claseEtiqueta}>
              Tu foto
            </label>
            <p id="r-foto-ayuda" className={`m-0 ${claseAyuda}`}>
              Una foto tuya, de frente y que se vea bien tu cara: así los turistas saben con quién van. Sale en tu perfil.
            </p>
            <div className="flex items-center gap-4">
              {vista ? (
                // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no pasa por el optimizador
                <img src={vista} alt="Vista previa de tu foto" className="size-24 flex-none rounded-full border border-linea object-cover" />
              ) : (
                <span aria-hidden="true" className="grid size-24 flex-none place-items-center rounded-full border border-dashed border-linea-fuerte text-3xl text-rio-suave">
                  ?
                </span>
              )}
              {/* Sin "name": el archivo no viaja con el formulario; se sube aparte, después de crear la ficha */}
              <input
                id="r-foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-describedby="r-foto-ayuda r-foto-aviso"
                aria-invalid={faltaFoto || undefined}
                onChange={(ev) => elegirFoto(ev.target.files?.[0] ?? null)}
                className="min-w-0 text-[15px] file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-linea-fuerte file:bg-papel file:px-4 file:font-semibold file:text-rio"
              />
            </div>
            <p id="r-foto-aviso" role={faltaFoto ? "alert" : undefined} className="m-0 text-sm leading-5 text-error">
              {faltaFoto ? "Pon tu foto para crear tu perfil de guía." : subida === "no" ? errorFoto : ""}
            </p>
          </div>
          <Casillas
            nombre="idiomas"
            leyenda="Idiomas"
            ayuda="En los que puedes guiar un recorrido (al menos uno)."
            opciones={IDIOMAS}
            marcadas={v.idiomas !== undefined ? v.idiomas.split(",") : ["es"]}
          />
          <Casillas nombre="especialidades" leyenda="Especialidades" ayuda="Qué recorridos haces (hasta 6)." opciones={ESPECIALIDADES} marcadas={v.especialidades?.split(",") ?? []} />
          <Campo id="r-zonas" etiqueta="Zonas donde trabajas" error={undefined}>
            <input id="r-zonas" name="zonas" maxLength={160} defaultValue={v.zonas} placeholder="Ej.: Centro, Las Peñas, Isla Santay" className={claseEntrada} />
          </Campo>
          <Campo
            id="r-credencial"
            etiqueta="Número de credencial de guía (MINTUR), si la tienes"
            error={undefined}
            ayuda="No se publica. Lo buscamos en el catastro del Ministerio de Turismo y, si está, tu ficha lleva la insignia «Guía acreditado». Puedes registrarte sin ella."
          >
            <input id="r-credencial" name="credencial" maxLength={40} autoComplete="off" defaultValue={v.credencial} className={claseEntrada} />
          </Campo>
          {e.guia && (
            <p role="alert" className="m-0 text-sm leading-5 text-error">
              {e.guia}
            </p>
          )}
        </div>
      )}
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
        {enviando ? "Registrando…" : guia ? "Crear mi perfil de guía" : "Registrar mi negocio"}
      </button>
    </form>
  );
}
