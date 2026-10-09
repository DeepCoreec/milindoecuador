"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { claseEntrada } from "@/components/ui/clasesFormulario";
import { IconoCerrar, IconoSilencio, IconoSonido, IconoUbicacion } from "@/components/ui/iconos";
import { tiempoDeLectura } from "@/lib/paumi/pantallas";
import { AVISO, MAX_HISTORIAL, MAX_MENSAJE, NOMBRE, SALUDO } from "@/lib/paumi/personaje";
import type { MensajePaumi, RespuestaPaumi, TarjetaPaumi } from "@/lib/paumi/tipos";
import { CuadroRetro } from "./CuadroRetro";
import { Guacamaya } from "./Guacamaya";
import type { EstadoPaumi } from "./sprite";

type Entrada = MensajePaumi & { lugares?: TarjetaPaumi[]; navegar?: string | null; fuentes?: RespuestaPaumi["fuentes"]; aviso?: boolean };

const inicial: Entrada[] = [{ rol: "paumi", texto: SALUDO }];
const CLAVE_SONIDO = "mle-paumi-sonido";

/**
 * Paumi, la guacamaya guía (versión 3, fases 14 y 15): botón flotante y ventana con dos vistas.
 *  - Escena (como un videojuego): la guacamaya en su rama y la respuesta en el cuadro retro, letra por letra con "blip";
 *    el cuadro se esconde solo según lo largo (no mientras lo tocas). Las tarjetas de lugares quedan arriba.
 *  - Conversación: todo lo que se dijo, para releer.
 * Lo que dice Paumi se muestra SIEMPRE como texto (nunca como HTML). Las tarjetas vienen armadas por el servidor.
 * El lector de pantalla recibe cada respuesta completa de una vez. La conversación vive solo en esta pestaña.
 */
export function Paumi() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<"escena" | "conversacion">("escena");
  const [mensajes, setMensajes] = useState<Entrada[]>(inicial);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [pideCaptcha, setPideCaptcha] = useState(true);
  const [intento, setIntento] = useState(0);
  const [enfocado, setEnfocado] = useState(false);
  // La guacamaya y el cuadro
  // Se leen al tiro: solo se usan dentro de la ventana, que nunca se arma en el servidor
  const [sonido, setSonido] = useState(() => {
    try {
      return typeof window === "undefined" || localStorage.getItem(CLAVE_SONIDO) !== "no";
    } catch {
      return true;
    }
  });
  const [reducir, setReducir] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [cuadro, setCuadro] = useState(true);
  const [tocando, setTocando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [pico, setPico] = useState(false);
  const [contento, setContento] = useState(false);
  const [leidos, setLeidos] = useState<ReadonlySet<number>>(new Set());
  const lista = useRef<HTMLDivElement>(null);
  const escena = useRef<HTMLDivElement>(null);
  const pregunta = useRef<HTMLParagraphElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  // La respuesta que va en el cuadro: la última de Paumi
  const indice = mensajes.findLastIndex((m) => m.rol === "paumi");
  const actual = mensajes[indice];
  const leido = leidos.has(indice);
  const ultimaPregunta = mensajes.findLast((m) => m.rol === "usuario");

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const leer = () => setReducir(consulta.matches);
    consulta.addEventListener("change", leer);
    return () => consulta.removeEventListener("change", leer);
  }, []);

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [mensajes, pensando, vista]);

  // Cuando llegan las tarjetas, la escena se acomoda para verlas debajo de la pregunta
  const conExtras = !!actual && (leido || reducir) && !pensando;
  useEffect(() => {
    if (conExtras && escena.current && pregunta.current) escena.current.scrollTo({ top: pregunta.current.offsetTop - 16 });
  }, [conExtras, indice]);

  // El cuadro se esconde solo cuando terminó de hablar y pasó el tiempo de lectura (nunca mientras lo tocas)
  useEffect(() => {
    if (!abierto || !cuadro || !leido || tocando || !actual) return;
    const id = setTimeout(() => setCuadro(false), tiempoDeLectura(actual.texto));
    return () => clearTimeout(id);
  }, [abierto, cuadro, leido, tocando, actual]);

  useEffect(() => {
    if (!contento) return;
    const id = setTimeout(() => setContento(false), 1600);
    return () => clearTimeout(id);
  }, [contento]);

  if (ruta.startsWith("/admin") || ruta.startsWith("/dev")) return null;

  const estado: EstadoPaumi = pensando ? "pensando" : contento ? "contento" : hablando ? "hablando" : enfocado && texto.trim() ? "escuchando" : "esperando";

  function cambiarSonido() {
    setSonido((s) => {
      try {
        localStorage.setItem(CLAVE_SONIDO, s ? "no" : "si");
      } catch {}
      return !s;
    });
  }

  function terminoDeHablar() {
    setHablando(false);
    setPico(false);
    if (!leidos.has(indice)) {
      setLeidos((l) => new Set(l).add(indice));
      if (actual?.lugares?.length) setContento(true);
    }
  }

  function decir(entrada: Entrada) {
    setMensajes((m) => [...m, entrada]);
    setCuadro(true);
    setHablando(!reducir);
  }

  function empezarDeNuevo() {
    setMensajes(inicial);
    setLeidos(new Set());
    setCuadro(true);
    setHablando(!reducir);
    setVista("escena");
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || pensando) return;
    const captcha = new FormData(e.currentTarget).get("cf-turnstile-response");
    const historial = [...mensajes.filter((m) => !m.aviso), { rol: "usuario" as const, texto: limpio }];
    setMensajes((m) => [...m, { rol: "usuario", texto: limpio }]);
    setTexto("");
    setPensando(true);
    setCuadro(false);
    setHablando(false);
    try {
      const r = await fetch("/api/paumi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mensajes: historial.slice(-MAX_HISTORIAL).map(({ rol, texto, firma }) => ({ rol, texto, firma })),
          captcha: typeof captcha === "string" && captcha ? captcha : undefined,
        }),
      });
      const datos = (await r.json().catch(() => ({}))) as Partial<RespuestaPaumi> & { error?: string; mensaje?: string };
      if (r.ok && typeof datos.texto === "string") {
        setPideCaptcha(false);
        decir({ rol: "paumi", texto: datos.texto, firma: datos.firma, lugares: datos.lugares ?? [], navegar: datos.navegar ?? null, fuentes: datos.fuentes ?? [] });
      } else {
        if (datos.error === "captcha") setPideCaptcha(true);
        decir({ rol: "paumi", texto: datos.mensaje ?? "No pude responder. Intenta de nuevo en un ratito.", aviso: true });
      }
    } catch {
      decir({ rol: "paumi", texto: "No hay conexión. Revisa tu internet e intenta de nuevo.", aviso: true });
    } finally {
      setPensando(false);
      setIntento((n) => n + 1);
      campo.current?.focus();
    }
  }

  const cerrar = () => setAbierto(false);

  return (
    <Dialog.Root
      open={abierto}
      onOpenChange={(a) => {
        setAbierto(a);
        // Al volver a abrir, lo ya leído se muestra entero (no se vuelve a escribir)
        if (a) {
          setCuadro(true);
          setHablando(!reducir && !leidos.has(indice));
        }
      }}
    >
      <Dialog.Trigger
        className={`${clasesBoton("secundario", "normal")} fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 shadow-flotante sm:right-6 sm:bottom-6`}
      >
        <Guacamaya recorte="cabeza" animada={false} className="h-8! w-12!" />
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
              <button
                type="button"
                onClick={cambiarSonido}
                aria-pressed={sonido}
                aria-label="Sonido al escribir"
                title={sonido ? "Sonido encendido" : "Sonido apagado"}
                className="inline-grid size-11 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-rio [&_svg]:size-5"
              >
                {sonido ? <IconoSonido /> : <IconoSilencio />}
              </button>
              <Dialog.Close aria-label="Cerrar" className="inline-grid size-11 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-rio [&_svg]:size-5">
                <IconoCerrar />
              </Dialog.Close>
            </div>
          </div>

          {/* El lector de pantalla recibe cada respuesta completa de una vez */}
          <p className="sr-only" aria-live="polite" aria-busy={pensando}>
            {pensando ? `${NOMBRE} está pensando.` : actual ? `${NOMBRE} dice: ${actual.texto}` : ""}
          </p>

          {vista === "escena" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div ref={escena} className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
                <p id="paumi-aviso" className="m-0 text-[13px] leading-[18px] text-rio-suave">
                  {AVISO}
                </p>
                {ultimaPregunta && <Burbuja ref={pregunta} texto={ultimaPregunta.texto} />}
                {conExtras && <Extras m={actual} alNavegar={cerrar} />}
              </div>
              <div className="grid gap-2 px-5 pb-3">
                <div className="flex items-end justify-between gap-2">
                  <Guacamaya estado={estado} pico={hablando ? pico : undefined} escala={3} className="-mb-2" />
                  <div className="flex flex-wrap justify-end gap-1">
                    {!cuadro && actual && !pensando && (
                      <button type="button" onClick={() => setCuadro(true)} className={clasesBoton("texto", "chico", "min-h-11")}>
                        Leer otra vez
                      </button>
                    )}
                    {mensajes.length > 1 && (
                      <button type="button" onClick={() => setVista("conversacion")} className={clasesBoton("texto", "chico", "min-h-11")}>
                        Ver conversación
                      </button>
                    )}
                  </div>
                </div>
                {cuadro && actual && !pensando && (
                  <CuadroRetro
                    key={indice}
                    data-testid="cuadro-paumi"
                    texto={actual.texto}
                    sonido={sonido}
                    quieto={reducir || leido}
                    alPico={setPico}
                    alTerminar={terminoDeHablar}
                    onPointerEnter={() => setTocando(true)}
                    onPointerLeave={() => setTocando(false)}
                    onFocus={() => setTocando(true)}
                    onBlur={() => setTocando(false)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div ref={lista} role="log" aria-label="Conversación con Paumi" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
              <div className="flex flex-wrap justify-between gap-1">
                <button type="button" onClick={() => setVista("escena")} className={clasesBoton("texto", "chico", "min-h-11")}>
                  Volver con {NOMBRE}
                </button>
                <button type="button" onClick={empezarDeNuevo} className={clasesBoton("texto", "chico", "min-h-11")}>
                  Empezar de nuevo
                </button>
              </div>
              <p id="paumi-aviso" className="m-0 text-[13px] leading-[18px] text-rio-suave">
                {AVISO}
              </p>
              {mensajes.map((m, i) => (
                <Mensaje key={i} m={m} alNavegar={cerrar} />
              ))}
              {pensando && <p className="m-0 max-w-[85%] self-start rounded-md bg-celeste-suave px-3.5 py-2.5 text-[15px] leading-[22px] text-rio-suave">{NOMBRE} está pensando…</p>}
            </div>
          )}

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
                onFocus={() => setEnfocado(true)}
                onBlur={() => setEnfocado(false)}
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

function Burbuja({ texto, ref }: { texto: string; ref?: React.Ref<HTMLParagraphElement> }) {
  return <p ref={ref} className="m-0 max-w-[85%] self-end rounded-md bg-celeste-tinta px-3.5 py-2.5 text-[15px] leading-[22px] break-words whitespace-pre-wrap text-on-celeste-tinta">{texto}</p>;
}

/** Lo que acompaña a una respuesta: tarjetas de lugares, botón para ir a una página y fuentes. */
function Extras({ m, alNavegar }: { m: Entrada; alNavegar: () => void }) {
  return (
    <>
      {m.lugares?.map((l) => (
        <TarjetaChat key={l.id} l={l} alNavegar={alNavegar} />
      ))}
      {m.navegar && (
        <Link href={m.navegar} onClick={alNavegar} className={clasesBoton("secundario", "chico", "justify-self-start self-start")}>
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
    </>
  );
}

function Mensaje({ m, alNavegar }: { m: Entrada; alNavegar: () => void }) {
  if (m.rol === "usuario") return <Burbuja texto={m.texto} />;
  return (
    <div className="grid max-w-[92%] gap-2 self-start">
      <p className="m-0 rounded-md bg-celeste-suave px-3.5 py-2.5 text-[15px] leading-[22px] break-words whitespace-pre-wrap">{m.texto}</p>
      <Extras m={m} alNavegar={alNavegar} />
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
