"use client";

import Image from "next/image";
import { startTransition, useActionState, useState } from "react";
import { borrarFoto, moverFoto, registrarFoto, type EstadoAdmin } from "@/acciones/admin";
import { clasesBoton } from "@/components/ui/Boton";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";
import type { FotoAdmin } from "@/lib/datos/admin";
import { aWebp } from "@/lib/imagen";
import { crearClienteNavegador } from "@/lib/supabase/client";

const inicial: EstadoAdmin = { estado: "inicio" };

/** Fotos de una ficha: subir (WebP, sin EXIF), ordenar y borrar. La primera es la principal. */
export function FotosLugar({ lugar, fotos }: { lugar: string; fotos: FotoAdmin[] }) {
  const [registro, registrar, registrando] = useActionState(registrarFoto, inicial);
  const [, borrar, borrando] = useActionState(borrarFoto, inicial);
  const [, mover, moviendo] = useActionState(moverFoto, inicial);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "error" | "ok"; texto: string } | null>(null);
  const ocupado = subiendo || registrando || borrando || moviendo;

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
      const webp = await aWebp(archivo);
      const camino = `lugares/${lugar}/${crypto.randomUUID()}.webp`;
      const { error } = await crearClienteNavegador().storage.from("fotos-lugares").upload(camino, webp, { contentType: "image/webp", upsert: false });
      if (error) throw new Error("No se pudo subir la foto. Revisa tu conexión e inténtalo de nuevo.");
      const datos = new FormData();
      datos.set("lugar", lugar);
      datos.set("camino", camino);
      datos.set("alt", alt);
      startTransition(() => registrar(datos));
      form.reset();
    } catch (err) {
      setAviso({ tipo: "error", texto: err instanceof Error ? err.message : "No se pudo subir la foto" });
    } finally {
      setSubiendo(false);
    }
  }

  const resultado = aviso ?? (registro.estado !== "inicio" ? { tipo: registro.estado === "ok" ? "ok" : "error", texto: registro.mensaje ?? "" } : null);

  return (
    <section aria-labelledby="t-fotos" className="grid gap-5 rounded-xl border border-linea bg-papel-alto p-6">
      <div className="grid gap-1">
        <h2 id="t-fotos" className="m-0 text-xl leading-[26px] font-semibold">
          Fotos
        </h2>
        <p className={`m-0 ${claseAyuda}`}>La primera es la foto principal. Sube fotos propias, horizontales y de día.</p>
      </div>

      {fotos.length > 0 && (
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 p-0">
          {fotos.map((f, i) => (
            <li key={f.id} className="grid gap-2">
              <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-celeste-suave">
                <Image src={f.src} alt={f.alt} fill sizes="200px" className="object-cover" />
                {i === 0 && <span className="absolute top-2 left-2 rounded-sm bg-mango px-2 py-0.5 text-[13px] leading-4 font-semibold text-on-color">Principal</span>}
              </div>
              <span className="text-[13px] leading-[18px] text-rio-suave">{f.alt}</span>
              <div className="flex flex-wrap gap-1">
                {(["antes", "despues"] as const).map((d) =>
                  (d === "antes" ? i > 0 : i < fotos.length - 1) ? (
                    <form key={d} action={mover}>
                      <input type="hidden" name="foto" value={f.id} />
                      <input type="hidden" name="direccion" value={d} />
                      <button type="submit" disabled={ocupado} className={clasesBoton("secundario", "chico", "min-h-9 px-3")} aria-label={`Mover ${d === "antes" ? "antes" : "después"}: ${f.alt}`}>
                        {d === "antes" ? "←" : "→"}
                      </button>
                    </form>
                  ) : null,
                )}
                <form action={borrar}>
                  <input type="hidden" name="foto" value={f.id} />
                  <button type="submit" disabled={ocupado} className={clasesBoton("texto", "chico", "min-h-9 text-error!")} aria-label={`Borrar foto: ${f.alt}`}>
                    Borrar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={subir} className="grid gap-4 border-t border-linea pt-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="f-archivo" className={claseEtiqueta}>
              Foto
            </label>
            <input id="f-archivo" name="archivo" type="file" accept="image/jpeg,image/png,image/webp" className="text-[15px] file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-md file:border file:border-linea-fuerte file:bg-papel file:px-4 file:font-semibold file:text-rio" />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="f-alt" className={claseEtiqueta}>
              ¿Qué se ve en la foto?
            </label>
            <input id="f-alt" name="alt" maxLength={160} placeholder="Ej.: Plato de encebollado con chifles" className={claseEntrada} />
          </div>
        </div>
        <p className={`m-0 ${claseAyuda}`}>Se convierte a WebP y se le quitan los datos de ubicación antes de subirla.</p>
        {resultado && resultado.texto && (
          <p role={resultado.tipo === "error" ? "alert" : "status"} className={`m-0 text-sm leading-5 font-semibold ${resultado.tipo === "error" ? "text-error" : "text-exito"}`}>
            {resultado.texto}
          </p>
        )}
        <button type="submit" disabled={ocupado} className={clasesBoton("secundario", "normal", "justify-self-start")}>
          {subiendo ? "Preparando y subiendo…" : "Subir foto"}
        </button>
      </form>
    </section>
  );
}
