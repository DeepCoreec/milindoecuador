"use client";

import Image from "next/image";
import { startTransition, useActionState, useState } from "react";
import type { EstadoAdmin } from "@/acciones/admin";
import { agregarFotoCommons, borrarFotoSitio, hacerPrincipalFotoSitio, pedirSubidaFotoSitio, registrarFotoSitio } from "@/acciones/fotos-guia";
import { clasesBoton } from "@/components/ui/Boton";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";
import { prepararFoto } from "@/lib/imagen";
import { crearClienteSubidas } from "@/lib/supabase/client";

const inicial: EstadoAdmin = { estado: "inicio" };

export type FotoSitioAdmin = { id: string; src: string; alt: string; credito: string | null; licencia: string | null; fuente: string | null };

/**
 * Fotos más de un lugar de la Guía útil (versión 12, 40.3): las traídas de Commons y las propias. Subir una propia
 * (se convierte a WebP sin datos del celular, con permiso de subida de un solo uso) o borrar cualquiera.
 */
export function FotosSitio({ sitio, fotos, tienePrincipal }: { sitio: string; fotos: FotoSitioAdmin[]; tienePrincipal: boolean }) {
  const [registro, registrar, registrando] = useActionState(registrarFotoSitio, inicial);
  const [borrado, borrar, borrando] = useActionState(borrarFotoSitio, inicial);
  const [deCommons, agregar, agregando] = useActionState(agregarFotoCommons, inicial);
  const [principal, hacerPrincipal, moviendo] = useActionState(hacerPrincipalFotoSitio, inicial);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "error" | "ok"; texto: string } | null>(null);
  const ocupado = subiendo || registrando || borrando || agregando || moviendo;
  const lleno = fotos.length >= 8;

  async function subir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const archivo = (form.elements.namedItem("archivo") as HTMLInputElement).files?.[0];
    const alt = (form.elements.namedItem("alt") as HTMLInputElement).value.trim();
    if (!archivo) return setAviso({ tipo: "error", texto: "Elige una foto" });
    if (alt.length < 3) return setAviso({ tipo: "error", texto: "Describe la foto en pocas palabras (mínimo 3 caracteres)" });
    setSubiendo(true);
    setAviso(null);
    try {
      const { foto, formato } = await prepararFoto(archivo);
      const permiso = await pedirSubidaFotoSitio(sitio, formato);
      if ("error" in permiso) throw new Error(permiso.error);
      const { error } = await crearClienteSubidas().storage.from("fotos-lugares").uploadToSignedUrl(permiso.camino, permiso.token, foto, { contentType: foto.type });
      if (error) throw new Error("No se pudo subir la foto. Revisa tu conexión e inténtalo de nuevo.");
      const datos = new FormData();
      datos.set("sitio", sitio);
      datos.set("camino", permiso.camino);
      datos.set("alt", alt);
      startTransition(() => registrar(datos));
      form.reset();
    } catch (err) {
      setAviso({ tipo: "error", texto: err instanceof Error ? err.message : "No se pudo subir la foto" });
    } finally {
      setSubiendo(false);
    }
  }

  const otros = [deCommons, principal].find((x) => x.estado !== "inicio");
  const ultimo = aviso ?? (otros ? { tipo: otros.estado === "ok" ? "ok" : "error", texto: otros.mensaje ?? "" } : null) ?? (registro.estado !== "inicio" ? { tipo: registro.estado === "ok" ? "ok" : "error", texto: registro.mensaje ?? "" } : borrado.estado !== "inicio" ? { tipo: borrado.estado === "ok" ? "ok" : "error", texto: borrado.mensaje ?? "" } : null);

  return (
    <section aria-labelledby="t-mas-fotos" className="grid gap-5 rounded-xl border border-linea bg-papel-alto p-6">
      <div className="grid gap-1">
        <h2 id="t-mas-fotos" className="m-0 text-xl leading-[26px] font-semibold">
          Más fotos ({fotos.length} de 8)
        </h2>
        <p className={`m-0 ${claseAyuda}`}>Se ven en la galería del lugar, después de la foto principal. Borra las que no sean del lugar o se vean mal.</p>
      </div>
      {fotos.length > 0 && (
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 p-0">
          {fotos.map((f) => (
            <li key={f.id} className="grid content-start gap-2">
              <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-celeste-suave">
                <Image src={f.src} alt={f.alt} fill sizes="200px" className="object-cover" />
              </div>
              <span className="text-[13px] leading-[18px] text-rio-suave">
                {f.fuente ? (
                  <>
                    {f.credito} ·{" "}
                    <a href={f.fuente} target="_blank" rel="noopener noreferrer">
                      {f.licencia}
                    </a>
                  </>
                ) : (
                  "Foto propia"
                )}
              </span>
              {!tienePrincipal && f.fuente && (
                <form action={hacerPrincipal}>
                  <input type="hidden" name="foto" value={f.id} />
                  <button type="submit" disabled={ocupado} className={clasesBoton("secundario", "chico", "min-h-9")}>
                    Hacer principal
                  </button>
                </form>
              )}
              <form action={borrar}>
                <input type="hidden" name="foto" value={f.id} />
                <button type="submit" disabled={ocupado} className={clasesBoton("texto", "chico", "min-h-9 text-error!")} aria-label={`Borrar foto: ${f.alt}`}>
                  Borrar
                </button>
              </form>
            </li>
          ))}
        </ol>
      )}
      <form action={agregar} className="grid gap-3 sm:max-w-[560px]">
        <input type="hidden" name="sitio" value={sitio} />
        <label className="grid gap-1.5">
          <span className={claseEtiqueta}>Foto de Wikimedia Commons (enlace)</span>
          <input name="enlace" type="url" placeholder="https://commons.wikimedia.org/wiki/File:..." className={claseEntrada} />
          <span className={claseAyuda}>Solo fotos con licencia libre; se guardan con su autor. Si el lugar no tiene foto principal, esta pasa a serlo.</span>
        </label>
        <div>
          <button type="submit" disabled={ocupado} className={clasesBoton("secundario", "chico")}>
            {agregando ? "Agregando…" : "Agregar de Commons"}
          </button>
        </div>
      </form>
      {!lleno && (
        <form onSubmit={subir} className="grid gap-3 sm:max-w-[480px]">
          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>Foto propia</span>
            <input name="archivo" type="file" accept="image/jpeg,image/png,image/webp,image/heic" className={claseEntrada} />
          </label>
          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>¿Qué se ve en la foto?</span>
            <input name="alt" type="text" maxLength={160} placeholder="La pileta del parque al atardecer" className={claseEntrada} />
          </label>
          <div>
            <button type="submit" disabled={ocupado} className={clasesBoton("principal", "chico")}>
              {subiendo || registrando ? "Subiendo…" : "Subir foto"}
            </button>
          </div>
        </form>
      )}
      <p role="status" className={`m-0 text-sm ${ultimo?.tipo === "error" ? "text-error" : "text-exito"}`}>
        {ultimo?.texto}
      </p>
    </section>
  );
}
