"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { claseEntrada } from "@/components/ui/clasesFormulario";
import { IconoCerrar, IconoMicrofono, IconoSilencio, IconoSonido, IconoUbicacion } from "@/components/ui/iconos";
import { tiempoDeLectura } from "@/lib/paumi/pantallas";
import { AVISO, AVISO_VOZ, MAX_HISTORIAL, MAX_MENSAJE, NOMBRE, SALUDO } from "@/lib/paumi/personaje";
import type { ExternoPaumi, MensajePaumi, RespuestaPaumi, TarjetaPaumi } from "@/lib/paumi/tipos";
import { CuadroRetro } from "./CuadroRetro";
import { Guacamaya } from "./Guacamaya";
import type { EstadoPaumi } from "./sprite";
import { despuesDelNombre } from "@/lib/paumi/voz";
import { callar, escuchar, escucharSiempre, hablar, mensajeErrorMicrofono, prepararVoz, puedeEscuchar, puedeManosLibres } from "./voz";

type Entrada = MensajePaumi & { lugares?: TarjetaPaumi[]; externos?: ExternoPaumi[]; navegar?: string | null; fuentes?: RespuestaPaumi["fuentes"]; aviso?: boolean };

const inicial: Entrada[] = [{ rol: "paumi", texto: SALUDO }];
const CLAVE_SONIDO = "mle-paumi-sonido";

/**
 * Paumi, la guacamaya guía (versión 3, fases 14 y 15): botón flotante y ventana con dos vistas.
 *  - Escena (como un videojuego): la guacamaya en su rama y la respuesta en el cuadro retro, letra por letra con "blip";
 *    el cuadro se esconde solo según lo largo (no mientras lo tocas). Las tarjetas de lugares quedan arriba.
 *  - Conversación: todo lo que se dijo, para releer.
 * Lo que dice Paumi se muestra SIEMPRE como texto (nunca como HTML). Las tarjetas vienen armadas por el servidor.
 * Voz (16.1): con el micrófono le hablas y te responde con la voz del teléfono (el texto sale igual en el cuadro).
 * Manos libres (16.2): solo si la persona lo activa; con la página a la vista, despierta al decir "Paumi" (el botón
 * flotante muestra el micrófono mientras tanto). Se pausa mientras Paumi habla y no se recuerda entre visitas.
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
  const sonidoAhora = useRef(sonido); // para la respuesta que llega después (si lo apagas mientras piensa)
  const [reducir, setReducir] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [cuadro, setCuadro] = useState(true);
  const [tocando, setTocando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [pico, setPico] = useState(false);
  const [contento, setContento] = useState(false);
  const [leidos, setLeidos] = useState<ReadonlySet<number>>(new Set());
  // Voz
  const [microfono] = useState(() => puedeEscuchar());
  const [libreDisponible] = useState(() => typeof window !== "undefined" && puedeManosLibres());
  const [oyendo, setOyendo] = useState(false);
  const [avisoMicrofono, setAvisoMicrofono] = useState<string | null>(null);
  const [voz, setVoz] = useState(false);
  const porVoz = useRef(false);
  const vozConPalabras = useRef(false);
  const pararMicrofono = useRef<() => void>(() => {});
  const cierraPico = useRef<ReturnType<typeof setTimeout>>(undefined);
  const formulario = useRef<HTMLFormElement>(null);
  const enviando = useRef(false); // candado: una pregunta a la vez (aunque lleguen dos frases o dos Enter seguidos)
  const [notaVoz, setNotaVoz] = useState<string | null>(null);
  const textoDeVoz = useRef(""); // lo que quedó escrito desde la voz (si se envía tal cual, responde hablando)
  // Manos libres
  const [manosLibres, setManosLibres] = useState(false);
  const [visible, setVisible] = useState(true);
  const [vuelta, setVuelta] = useState(0);
  const cortes = useRef<number[]>([]);
  const pararLibre = useRef<() => void>(() => {});
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
    if (!abierto || !cuadro || !leido || tocando || voz || !actual) return;
    const id = setTimeout(() => setCuadro(false), tiempoDeLectura(actual.texto));
    return () => clearTimeout(id);
  }, [abierto, cuadro, leido, tocando, voz, actual]);

  // Al salir, nada sigue escuchando ni hablando
  useEffect(
    () => () => {
      pararMicrofono.current();
      callar();
    },
    [],
  );

  useEffect(() => {
    if (!contento) return;
    const id = setTimeout(() => setContento(false), 1600);
    return () => clearTimeout(id);
  }, [contento]);

  // ---------- Manos libres: escucha seguido y despierta al oír su nombre ----------
  useEffect(() => {
    const ver = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", ver);
    return () => document.removeEventListener("visibilitychange", ver);
  }, []);

  const oirFrase = useEffectEvent((frase: string) => {
    const pedido = despuesDelNombre(frase);
    if (pedido === null) return; // no la llamaron: no se hace nada con lo que se oyó
    pararLibre.current();
    abrir();
    setUltimaLlamada(Date.now());
    if (pedido && pideCaptcha) {
      // La primera vez hay que confirmar que no eres un robot: queda escrito para enviarlo con un toque
      setTexto(pedido.slice(0, MAX_MENSAJE));
      textoDeVoz.current = pedido.slice(0, MAX_MENSAJE);
      setNotaVoz("Te escuché. Confirma que no eres un robot y toca «Enviar».");
    } else if (pedido) {
      porVoz.current = true;
      void enviarTexto(pedido.slice(0, MAX_MENSAJE));
    } else usarMicrofono(); // solo dijeron "Paumi": te escucha
  });
  const errorLibre = useEffectEvent((error: string) => {
    if (["not-allowed", "service-not-allowed", "not-supported", "audio-capture"].includes(error)) {
      setManosLibres(false);
      setAvisoMicrofono(mensajeErrorMicrofono(error));
    }
  });
  const seCorto = useEffectEvent(() => {
    // El navegador corta cada tanto y se vuelve a encender; si se corta muy seguido, se apaga para no gastar
    const ahora = Date.now();
    cortes.current = [...cortes.current.filter((t) => ahora - t < 10_000), ahora];
    if (cortes.current.length > 5) {
      setManosLibres(false);
      setAvisoMicrofono("Apagué el manos libres porque el micrófono se cortaba seguido. Puedes volver a activarlo.");
    } else setVuelta((n) => n + 1);
  });

  // Se apaga solo si pasan 10 minutos sin que la llamen (para no dejar el micrófono encendido sin querer)
  const [ultimaLlamada, setUltimaLlamada] = useState(0);
  useEffect(() => {
    if (!manosLibres) return;
    const id = setTimeout(() => {
      pararLibre.current();
      setManosLibres(false);
      setAvisoMicrofono("Apagué el manos libres porque pasaron 10 minutos sin que me llames.");
    }, 10 * 60_000);
    return () => clearTimeout(id);
  }, [manosLibres, ultimaLlamada]);

  const escuchaLibre = manosLibres && visible && !oyendo && !voz && !pensando && !ruta.startsWith("/admin") && !ruta.startsWith("/dev");
  useEffect(() => {
    if (!escuchaLibre) return;
    const parar = escucharSiempre({ alOir: (f) => oirFrase(f), alError: (e) => errorLibre(e), alTerminar: () => seCorto() });
    pararLibre.current = parar;
    return parar;
  }, [escuchaLibre, vuelta]);

  if (ruta.startsWith("/admin") || ruta.startsWith("/dev")) return null;

  const estado: EstadoPaumi = pensando
    ? "pensando"
    : oyendo
      ? "escuchando"
      : contento
        ? "contento"
        : hablando || voz
          ? "hablando"
          : enfocado && texto.trim()
            ? "escuchando"
            : "esperando";

  function abrir() {
    setAbierto(true);
    // Al volver a abrir, lo ya leído se muestra entero (no se vuelve a escribir)
    setCuadro(true);
    setHablando(!reducir && !leidos.has(indice));
  }

  function cambiarManosLibres() {
    if (manosLibres) {
      pararLibre.current();
      setManosLibres(false);
      return;
    }
    prepararVoz();
    cortes.current = [];
    setAvisoMicrofono(null);
    setManosLibres(true);
  }

  function cambiarSonido() {
    if (sonido) {
      callar();
      setVoz(false);
    }
    sonidoAhora.current = !sonido;
    setSonido(!sonido);
    try {
      localStorage.setItem(CLAVE_SONIDO, sonido ? "no" : "si");
    } catch {}
  }

  function terminoDeHablar() {
    setHablando(false);
    setPico(false);
    if (!leidos.has(indice)) {
      setLeidos((l) => new Set(l).add(indice));
      if (actual?.lugares?.length || actual?.externos?.length) setContento(true);
    }
  }

  function decir(entrada: Entrada) {
    setMensajes((m) => [...m, entrada]);
    setCuadro(true);
    setHablando(!reducir);
    // Si le preguntaste hablando, te responde hablando (el texto sale igual en el cuadro)
    if (porVoz.current && sonidoAhora.current) {
      setVoz(true);
      vozConPalabras.current = false;
      hablar(entrada.texto, {
        alPalabra: () => {
          vozConPalabras.current = true;
          setPico(true);
          clearTimeout(cierraPico.current);
          cierraPico.current = setTimeout(() => setPico(false), 160);
        },
        alTerminar: () => {
          setVoz(false);
          setPico(false);
        },
      });
    }
    porVoz.current = false;
  }

  /** Mientras habla con voz, el pico lo mueve la voz (si la voz avisa cada palabra); si no, el texto. */
  function picoDelTexto(abierto: boolean) {
    if (!(voz && vozConPalabras.current)) setPico(abierto);
  }

  function usarMicrofono() {
    if (oyendo) {
      pararMicrofono.current();
      return;
    }
    prepararVoz();
    callar();
    setVoz(false);
    setAvisoMicrofono(null);
    setOyendo(true);
    pararMicrofono.current = escuchar({
      alParcial: (t) => setTexto(t.slice(0, MAX_MENSAJE)),
      alFinal: (t) => {
        porVoz.current = true;
        void enviarTexto(t.slice(0, MAX_MENSAJE));
      },
      alError: (e) => setAvisoMicrofono(mensajeErrorMicrofono(e)),
      alTerminar: () => setOyendo(false),
    });
  }

  function empezarDeNuevo() {
    callar();
    setVoz(false);
    setMensajes(inicial);
    setLeidos(new Set());
    setCuadro(true);
    setHablando(!reducir);
    setVista("escena");
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    porVoz.current = !!textoDeVoz.current && texto === textoDeVoz.current;
    textoDeVoz.current = "";
    void enviarTexto(texto);
  }

  async function enviarTexto(t: string) {
    const limpio = t.trim();
    if (!limpio || pensando || enviando.current) return;
    enviando.current = true;
    setNotaVoz(null);
    callar();
    setVoz(false);
    const captcha = formulario.current ? new FormData(formulario.current).get("cf-turnstile-response") : null;
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
        decir({ rol: "paumi", texto: datos.texto, firma: datos.firma, lugares: datos.lugares ?? [], externos: datos.externos ?? [], navegar: datos.navegar ?? null, fuentes: datos.fuentes ?? [] });
      } else {
        if (datos.error === "captcha") setPideCaptcha(true);
        decir({ rol: "paumi", texto: datos.mensaje ?? "No pude responder. Intenta de nuevo en un ratito.", aviso: true });
      }
    } catch {
      decir({ rol: "paumi", texto: "No hay conexión. Revisa tu internet e intenta de nuevo.", aviso: true });
    } finally {
      enviando.current = false;
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
        if (a) abrir();
        else {
          setAbierto(false);
          pararMicrofono.current();
          callar();
          setVoz(false);
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
        {manosLibres && (
          <span className="inline-flex text-celeste-tinta" title="Manos libres encendido: di su nombre para hablarle">
            <IconoMicrofono />
            <span className="sr-only">(manos libres encendido)</span>
          </span>
        )}
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
                {microfono && <p className="m-0 text-[13px] leading-[18px] text-rio-suave">{AVISO_VOZ}</p>}
                {libreDisponible && (
                  <div className="grid justify-items-start gap-1">
                    <button type="button" onClick={cambiarManosLibres} aria-pressed={manosLibres} className={clasesBoton("secundario", "chico", "min-h-11 [&_svg]:size-4")}>
                      <IconoMicrofono />
                      {manosLibres ? "Apagar manos libres" : "Activar manos libres"}
                    </button>
                    {manosLibres && (
                      <p className="m-0 text-[13px] leading-[18px] text-rio-suave">
                        Di «{NOMBRE}» y lo que buscas, por ejemplo: «{NOMBRE}, ¿dónde como un encebollado?». Solo te escucho mientras esta página está abierta y
                        a la vista; mientras tanto, tu navegador (en Chrome, Google) procesa lo que oye el micrófono para encontrar mi nombre. Me apago
                        solo si pasan 10 minutos sin que me llames.
                      </p>
                    )}
                  </div>
                )}
                {ultimaPregunta && <Burbuja ref={pregunta} texto={ultimaPregunta.texto} />}
                {conExtras && <Extras m={actual} alNavegar={cerrar} />}
              </div>
              <div className="grid gap-2 px-5 pb-3">
                <div className="flex items-end justify-between gap-2">
                  <Guacamaya estado={estado} pico={hablando || voz ? pico : undefined} escala={3} className="-mb-2" />
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
                    sonido={sonido && !voz}
                    quieto={reducir || leido}
                    alPico={picoDelTexto}
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

          <form ref={formulario} onSubmit={enviar} className="grid gap-2 border-t border-linea px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
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
                placeholder={oyendo ? "Te escucho…" : "Ej.: encebollado"}
                className={`${claseEntrada} max-h-32 min-h-12 resize-none`}
              />
              {microfono && (
                <button
                  type="button"
                  onClick={usarMicrofono}
                  disabled={pensando}
                  aria-pressed={oyendo}
                  aria-label={oyendo ? "Dejar de escuchar" : `Hablarle a ${NOMBRE}`}
                  className={clasesBoton("secundario", "normal", `w-12 shrink-0 px-0 ${oyendo ? "border-celeste-tinta! bg-celeste-suave! text-celeste-tinta!" : ""}`)}
                >
                  <IconoMicrofono />
                </button>
              )}
              <button type="submit" disabled={pensando || !texto.trim()} className={clasesBoton("principal", "normal", "shrink-0")}>
                Enviar
              </button>
            </div>
            {oyendo && (
              <p className="m-0 text-[13px] leading-[18px] text-celeste-tinta" role="status">
                Te escucho. Habla y cuando termines, te respondo.
              </p>
            )}
            {notaVoz && !oyendo && (
              <p className="m-0 text-[13px] leading-[18px] text-celeste-tinta" role="status">
                {notaVoz}
              </p>
            )}
            {avisoMicrofono && !oyendo && (
              <p className="m-0 text-[13px] leading-[18px] text-error" role="alert">
                {avisoMicrofono}
              </p>
            )}
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
      {m.externos?.map((x) => (
        <TarjetaExterna key={x.nombre} x={x} />
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

/** Lugar de internet (fuera de la guía): sin foto ni ficha; Google Maps da la dirección real y se ve de dónde salió. */
function TarjetaExterna({ x }: { x: ExternoPaumi }) {
  return (
    <article className="grid gap-1 rounded-md border border-dashed border-linea-fuerte bg-papel-alto p-3">
      <h3 className="m-0 text-[15px] leading-5 font-semibold break-words">{x.nombre}</h3>
      <p className="m-0 text-[13px] leading-[18px] text-rio-suave">
        {x.sector ? `${x.sector}. ` : ""}No está en nuestra guía: lo encontré en {x.fuente.sitio}. Confirma horarios y precios antes de ir.
      </p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        <a href={x.mapa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm leading-5 font-semibold [&_svg]:size-4">
          <IconoUbicacion />
          Ver en Google Maps
        </a>
        <a href={x.fuente.url} target="_blank" rel="noopener noreferrer nofollow" className="text-sm leading-5 font-semibold">
          Ver la fuente
        </a>
      </div>
    </article>
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
