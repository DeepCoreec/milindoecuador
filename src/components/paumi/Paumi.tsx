"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { claseEntrada } from "@/components/ui/clasesFormulario";
import { IconoCerrar, IconoConversacion, IconoUbicacion } from "@/components/ui/iconos";
import { AVISO, MAX_HISTORIAL, MAX_MENSAJE, NOMBRE, SALUDO } from "@/lib/paumi/personaje";
import type { MensajePaumi, RespuestaPaumi, TarjetaPaumi } from "@/lib/paumi/tipos";

type Entrada = MensajePaumi & { lugares?: TarjetaPaumi[]; navegar?: string | null; fuentes?: RespuestaPaumi["fuentes"]; aviso?: boolean };

const inicial: Entrada[] = [{ rol: "paumi", texto: SALUDO }];

/**
 * Paumi, la guacamaya guía (versión 3, paso 14.3): botón flotante y ventana de conversación.
 * Lo que dice Paumi se muestra SIEMPRE como texto (nunca como HTML). Las tarjetas vienen armadas por el servidor.
 * La conversación vive solo en esta pestaña (no se guarda en ningún lado). En la fase 15 llega la guacamaya en
 * pixel art y el cuadro de diálogo retro; en la 16, la voz.
 */
export function Paumi() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Entrada[]>(inicial);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [pideCaptcha, setPideCaptcha] = useState(true);
  const [intento, setIntento] = useState(0);
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [mensajes, pensando]);

  if (ruta.startsWith("/admin") || ruta.startsWith("/dev")) return null;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || pensando) return;
    const captcha = new FormData(e.currentTarget).get("cf-turnstile-response");
    const historial = [...mensajes.filter((m) => !m.aviso), { rol: "usuario" as const, texto: limpio }];
    setMensajes((m) => [...m, { rol: "usuario", texto: limpio }]);
    setTexto("");
    setPensando(true);
    try {
      const r = await fetch("/api/paumi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mensajes: historial.slice(-MAX_HISTORIAL).map(({ rol, texto }) => ({ rol, texto })),
          captcha: typeof captcha === "string" && captcha ? captcha : undefined,
        }),
      });
      const datos = (await r.json().catch(() => ({}))) as Partial<RespuestaPaumi> & { error?: string; mensaje?: string };
      if (r.ok && typeof datos.texto === "string") {
        setPideCaptcha(false);
        setMensajes((m) => [...m, { rol: "paumi", texto: datos.texto!, lugares: datos.lugares ?? [], navegar: datos.navegar ?? null, fuentes: datos.fuentes ?? [] }]);
      } else {
        if (datos.error === "captcha") setPideCaptcha(true);
        setMensajes((m) => [...m, { rol: "paumi", texto: datos.mensaje ?? "No pude responder. Intenta de nuevo en un ratito.", aviso: true }]);
      }
    } catch {
      setMensajes((m) => [...m, { rol: "paumi", texto: "No hay conexión. Revisa tu internet e intenta de nuevo.", aviso: true }]);
    } finally {
      setPensando(false);
      setIntento((n) => n + 1);
      campo.current?.focus();
    }
  }

  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger
        className={`${clasesBoton("secundario", "normal")} fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 shadow-flotante sm:right-6 sm:bottom-6`}
      >
        <IconoConversacion />
        <span>
          <span className="max-sm:hidden">Pregúntale a </span>
          {NOMBRE}
        </span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="mle-velo fixed inset-0 z-40 bg-[#0b1d28]/40 sm:bg-transparent" />
        <Dialog.Content
          aria-describedby="paumi-aviso"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col rounded-t-[20px] border border-linea bg-papel-alto text-rio shadow-flotante sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(640px,calc(100dvh-48px))] sm:w-[400px] sm:rounded-[20px]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-linea px-5 pt-4 pb-3">
            <div className="grid gap-0.5">
              <Dialog.Title className="m-0 font-rotulo text-[17px] leading-6 font-normal">{NOMBRE}</Dialog.Title>
              <p className="m-0 text-sm leading-5 text-rio-suave">La guacamaya guía de Guayaquil</p>
            </div>
            <div className="flex items-center gap-1">
              {mensajes.length > 1 && (
                <button type="button" onClick={() => setMensajes(inicial)} className={clasesBoton("texto", "chico", "min-h-11")}>
                  Empezar de nuevo
                </button>
              )}
              <Dialog.Close aria-label="Cerrar" className="inline-grid size-11 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-rio [&_svg]:size-5">
                <IconoCerrar />
              </Dialog.Close>
            </div>
          </div>

          <div ref={lista} role="log" aria-live="polite" aria-busy={pensando} className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
            <p id="paumi-aviso" className="m-0 text-[13px] leading-[18px] text-rio-suave">
              {AVISO}
            </p>
            {mensajes.map((m, i) => (
              <Mensaje key={i} m={m} alNavegar={() => setAbierto(false)} />
            ))}
            {pensando && <p className="m-0 max-w-[85%] self-start rounded-md bg-celeste-suave px-3.5 py-2.5 text-[15px] leading-[22px] text-rio-suave">{NOMBRE} está pensando…</p>}
          </div>

          <form onSubmit={enviar} className="grid gap-2 border-t border-linea px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
            {pideCaptcha && <Captcha reiniciar={intento} />}
            <div className="flex items-end gap-2">
              <label htmlFor="paumi-texto" className="sr-only">
                Escríbele a {NOMBRE}
              </label>
              <textarea
                id="paumi-texto"
                ref={campo}
                value={texto}
                onChange={(e) => setTexto(e.target.value.slice(0, MAX_MENSAJE))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={MAX_MENSAJE}
                placeholder="Ej.: encebollado barato"
                className={`${claseEntrada} max-h-32 min-h-12 resize-none`}
              />
              <button type="submit" disabled={pensando || !texto.trim()} className={clasesBoton("principal", "normal", "shrink-0")}>
                Enviar
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Mensaje({ m, alNavegar }: { m: Entrada; alNavegar: () => void }) {
  if (m.rol === "usuario")
    return <p className="m-0 max-w-[85%] self-end rounded-md bg-celeste-tinta px-3.5 py-2.5 text-[15px] leading-[22px] break-words whitespace-pre-wrap text-on-celeste-tinta">{m.texto}</p>;
  return (
    <div className="grid max-w-[92%] gap-2 self-start">
      <p className="m-0 rounded-md bg-celeste-suave px-3.5 py-2.5 text-[15px] leading-[22px] break-words whitespace-pre-wrap">{m.texto}</p>
      {m.lugares?.map((l) => (
        <TarjetaChat key={l.id} l={l} alNavegar={alNavegar} />
      ))}
      {m.navegar && (
        <Link href={m.navegar} onClick={alNavegar} className={clasesBoton("secundario", "chico", "justify-self-start")}>
          Ir a la página
        </Link>
      )}
      {!!m.fuentes?.length && (
        <p className="m-0 text-[13px] leading-[18px] text-rio-suave">
          Fuente:{" "}
          {m.fuentes.map((f, i) => (
            <span key={f.url}>
              {i > 0 && ", "}
              <a href={f.url} target="_blank" rel="noopener noreferrer nofollow">
                {f.titulo}
              </a>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function TarjetaChat({ l, alNavegar }: { l: TarjetaPaumi; alNavegar: () => void }) {
  return (
    <article className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-md border border-linea bg-papel-alto p-2.5">
      <div className="relative size-[72px] overflow-hidden rounded-sm bg-celeste-suave">
        {l.foto && <Image src={l.foto.src} alt={l.foto.alt} fill sizes="72px" className="object-cover" />}
      </div>
      <div className="grid min-w-0 content-start gap-1">
        <h3 className="m-0 truncate text-[15px] leading-5 font-semibold">{l.nombre}</h3>
        <p className="m-0 text-[13px] leading-[18px] text-rio-suave">
          {l.categoria} en {l.sector}
          {l.precio ? `, precio ${l.precio}` : ""}
        </p>
        {l.estado && <p className={`m-0 text-[13px] leading-[18px] font-semibold ${l.abierto ? "text-exito" : "text-rio-suave"}`}>{l.estado}</p>}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <a href={l.comoLlegar} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm leading-5 font-semibold [&_svg]:size-4">
            <IconoUbicacion />
            Cómo llegar
          </a>
          <Link href={l.ruta} onClick={alNavegar} className="text-sm leading-5 font-semibold">
            Ver ficha
          </Link>
        </div>
      </div>
    </article>
  );
}
