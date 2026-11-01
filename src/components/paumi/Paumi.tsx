"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { claseEntrada } from "@/components/ui/clasesFormulario";
import { IconoCerrar, IconoMicrofono, IconoSilencio, IconoSonido, IconoUbicacion } from "@/components/ui/iconos";
import { tiempoDeLectura } from "@/lib/paumi/pantallas";
import { AVISO, AVISO_VOZ, MAX_HISTORIAL, MAX_MENSAJE, NOMBRE, SALUDO } from "@/lib/paumi/personaje";
import { leerMovimiento, SECCIONES, type Movimiento } from "@/lib/paumi/secciones";
import type { ExternoPaumi, MensajePaumi, RespuestaPaumi, TarjetaPaumi } from "@/lib/paumi/tipos";
import { CuadroRetro } from "./CuadroRetro";
import { Guacamaya } from "./Guacamaya";
import type { EstadoPaumi } from "./sprite";
import { callar, escuchar, hablar, mensajeErrorMicrofono, prepararVoz, puedeEscuchar } from "./voz";

type Entrada = MensajePaumi & {
  lugares?: TarjetaPaumi[];
  externos?: ExternoPaumi[];
  navegar?: string | null;
  fuentes?: RespuestaPaumi["fuentes"];
  aviso?: boolean;
  /** Versión 8: Paumi pidió permiso para usar la ubicación (aparece «Sí, usa mi ubicación»). */
  pedirUbicacion?: boolean;
};

const inicial: Entrada[] = [{ rol: "paumi", texto: SALUDO }];
const CLAVE_SONIDO = "mle-paumi-sonido";
/**
 * Mueve la página por dentro (2026-11-01): baja a una parte y la resalta, pasa fotos, abre todas las categorías o sube.
 * Solo con palabras conocidas (secciones.ts) y elementos de la propia página. Si la parte todavía no está (la página
 * se está abriendo), lo vuelve a intentar unos segundos.
 */
function moverPagina(m: Movimiento, suave: boolean, intento = 0) {
  const comportamiento: ScrollBehavior = suave ? "smooth" : "auto";
  if (m.accion === "arriba") {
    window.scrollTo({ top: 0, behavior: comportamiento });
    return;
  }
  const resaltar = (el: Element) => {
    el.scrollIntoView({ behavior: comportamiento, block: "start" });
    el.classList.add("mle-resalta");
    setTimeout(() => el.classList.remove("mle-resalta"), 2600);
  };
  const reintentar = () => {
    if (intento < 16) setTimeout(() => moverPagina(m, suave, intento + 1), 250);
  };
  if (m.accion === "todas_las_categorias") {
    const b = document.querySelector<HTMLButtonElement>('nav[aria-label="Categorías"] button[aria-expanded]');
    if (!b) return reintentar();
    if (b.getAttribute("aria-expanded") !== "true") b.click();
    resaltar(b.closest("nav") ?? b);
    return;
  }
  if (m.accion === "foto_siguiente" || m.accion === "foto_anterior") {
    const nombre = m.accion === "foto_siguiente" ? "Foto siguiente" : "Foto anterior";
    const flecha = [...document.querySelectorAll<HTMLButtonElement>(`button[aria-label="${nombre}"]`)].find((b) => b.offsetParent !== null);
    if (flecha) {
      flecha.click();
      flecha.closest("#fotos")?.scrollIntoView({ behavior: comportamiento, block: "start" });
      return;
    }
    // En la ficha de un negocio, las flechas están en la vista grande: se abre tocando la primera foto
    const abrir = document.querySelector<HTMLButtonElement>("#fotos button");
    if (abrir) abrir.click();
    else reintentar();
    return;
  }
  if (m.seccion) {
    const el = SECCIONES[m.seccion].ids.map((id) => document.getElementById(id)).find((x) => x !== null);
    if (!el) return reintentar();
    // Se resalta la sección entera que nombra ese título (o el elemento, si no está dentro de una)
    resaltar(el.closest("section, aside, details, nav") ?? el);
  }
}

/** ¿Todavía no pasó esa hora? (fuera del componente: solo se usa al enviar, nunca al dibujar) */
const sigueVigente = (hasta: number) => hasta > Date.now();
/** Cómo prefiere hablar con Paumi esta persona (2026-11-01): se pregunta al presentarse y se recuerda. */
const CLAVE_MODO = "mle-paumi-modo";

/**
 * Paumi, la guacamaya guía (versión 3, fases 14 y 15): botón flotante y ventana con dos vistas.
 *  - Escena (como un videojuego): la guacamaya en su rama y la respuesta en el cuadro retro, letra por letra con "blip";
 *    el cuadro se esconde solo según lo largo (no mientras lo tocas). Las tarjetas de lugares quedan arriba.
 *  - Conversación: todo lo que se dijo, para releer.
 * Lo que dice Paumi se muestra SIEMPRE como texto (nunca como HTML). Las tarjetas vienen armadas por el servidor.
 * Voz (16.1): con el micrófono le hablas y te responde con la voz del teléfono (el texto sale igual en el cuadro).
 *   Desde el 2026-11-01 (pedido del usuario: "hagamos que hable") responde hablando SIEMPRE que el sonido esté
 *   encendido, también si le escribes; el botón del parlante la calla.
 * Manos libres (16.2): solo si la persona lo activa; con la página a la vista, despierta al decir "Paumi" (el botón
 * flotante muestra el micrófono mientras tanto). Se pausa mientras Paumi habla y no se recuerda entre visitas.
 * El lector de pantalla recibe cada respuesta completa de una vez. La conversación vive solo en esta pestaña.
 */
export function Paumi() {
  const ruta = usePathname();
  const router = useRouter();
  // En el celular, cuando Paumi te lleva a otra página, la ventana baja a la mitad para que la veas (2026-11-01)
  const [mitad, setMitad] = useState(false);
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
  // Cómo hablarle (2026-11-01): "texto" (te responde escrito), "voz" (te responde hablando; tocas el micrófono) o
  // "conversa" (manos libres: te escucha sola después de cada respuesta). Se recuerda texto o voz, nunca la conversación.
  const [modo, setModo] = useState<"voz" | "texto" | "conversa" | null>(() => {
    try {
      const m = typeof window === "undefined" ? null : localStorage.getItem(CLAVE_MODO);
      return m === "voz" || m === "texto" ? m : null;
    } catch {
      return null;
    }
  });
  const [reducir, setReducir] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [cuadro, setCuadro] = useState(true);
  const [tocando, setTocando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [pico, setPico] = useState(false);
  const [contento, setContento] = useState(false);
  const [leidos, setLeidos] = useState<ReadonlySet<number>>(new Set());
  // Voz
  const [microfono] = useState(() => puedeEscuchar());
  const [oyendo, setOyendo] = useState(false);
  const [avisoMicrofono, setAvisoMicrofono] = useState<string | null>(null);
  const [voz, setVoz] = useState(false);
  const porVoz = useRef(false);
  const vozConPalabras = useRef(false);
  const pararMicrofono = useRef<() => void>(() => {});
  const cierraPico = useRef<ReturnType<typeof setTimeout>>(undefined);
  const formulario = useRef<HTMLFormElement>(null);
  const enviando = useRef(false); // candado: una pregunta a la vez (aunque lleguen dos frases o dos Enter seguidos)
  // Versión 8 (34.3): ubicación de "Cerca de mí", solo en memoria y por 15 minutos (para seguir preguntando "¿y cafés?")
  const ubicacion = useRef<{ lat: number; lng: number; hasta: number } | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [usandoUbicacion, setUsandoUbicacion] = useState(false);
  const quitarUbicacion = () => {
    ubicacion.current = null;
    setUsandoUbicacion(false);
  };
  const [notaVoz, setNotaVoz] = useState<string | null>(null);
  const textoDeVoz = useRef(""); // lo que quedó escrito desde la voz (si se envía tal cual, responde hablando)
  // Manos libres
  const [manosLibres, setManosLibres] = useState(false);
  const [visible, setVisible] = useState(true);
  const [vuelta, setVuelta] = useState(0);
  const silencios = useRef(0); // vueltas seguidas sin que digas nada (la conversación se apaga a la cuarta)
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

  function cambiarSonido() {
    if (sonido) {
      callar();
      setVoz(false);
    }
    sonidoAhora.current = !sonido;
    setSonido(!sonido);
    if (sonido) {
      // Callarla es pasar a "Escribir"
      setModo("texto");
      if (manosLibres) pararMicrofono.current();
      setManosLibres(false);
    } else setModo("voz");
    try {
      localStorage.setItem(CLAVE_SONIDO, sonido ? "no" : "si");
      localStorage.setItem(CLAVE_MODO, sonido ? "texto" : "voz");
    } catch {}
  }

  /**
   * Cómo hablarle a Paumi (2026-11-01, pedido del usuario), siempre a la vista arriba de la ventana:
   *  - Escribir: te responde solo con texto.
   *  - Hablar: te responde hablando; tocas el micrófono para hablarle (te deja hacer pausas).
   *  - Conversar (manos libres): te responde hablando y te vuelve a escuchar sola, sin tocar nada.
   */
  function elegirModo(m: "voz" | "texto" | "conversa") {
    setModo(m);
    const conSonido = m !== "texto";
    sonidoAhora.current = conSonido;
    setSonido(conSonido);
    try {
      localStorage.setItem(CLAVE_MODO, m === "texto" ? "texto" : "voz");
      localStorage.setItem(CLAVE_SONIDO, conSonido ? "si" : "no");
    } catch {}
    setAvisoMicrofono(null);
    if (m !== "conversa") {
      if (manosLibres) pararMicrofono.current();
      setManosLibres(false);
    }
    if (m === "texto") {
      callar();
      setVoz(false);
      campo.current?.focus();
      return;
    }
    prepararVoz(); // en iPhone la voz se "despierta" con este toque
    if (m === "conversa") {
      silencios.current = 0;
      setManosLibres(true);
    }
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
    // Responde hablando si el sonido está encendido (el texto sale igual en el cuadro)
    if (sonidoAhora.current) {
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
    ubicacion.current = null; // empezar de nuevo también olvida la ubicación (revisión del 2026-10-30, hallazgo 4)
    setUsandoUbicacion(false);
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
    // En iPhone la voz solo arranca si se "despierta" con un toque: el de Enviar
    if (sonidoAhora.current) prepararVoz();
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
      const u = ubicacion.current && sigueVigente(ubicacion.current.hasta) ? ubicacion.current : null;
      const r = await fetch("/api/paumi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mensajes: historial.slice(-MAX_HISTORIAL).map(({ rol, texto, firma }) => ({ rol, texto, firma })),
          captcha: typeof captcha === "string" && captcha ? captcha : undefined,
          ubicacion: u ? { lat: u.lat, lng: u.lng } : undefined,
          pagina: window.location.pathname,
        }),
      });
      const datos = (await r.json().catch(() => ({}))) as Partial<RespuestaPaumi> & { error?: string; mensaje?: string };
      if (r.ok && typeof datos.texto === "string") {
        setPideCaptcha(false);
        decir({
          rol: "paumi",
          texto: datos.texto,
          firma: datos.firma,
          lugares: datos.lugares ?? [],
          externos: datos.externos ?? [],
          navegar: datos.navegar ?? null,
          fuentes: datos.fuentes ?? [],
          pedirUbicacion: datos.pedirUbicacion === true,
        });
        // 2026-11-01 (pedido del usuario): la página se mueve con la conversación. Paumi sigue abierta y hablando.
        // La ruta ya viene revisada por el servidor (solo páginas de la guía que devolvieron sus herramientas).
        if (datos.navegar && datos.navegar.startsWith("/") && !datos.navegar.startsWith("//") && datos.navegar !== window.location.pathname + window.location.search)
        {
          router.push(datos.navegar, { scroll: true });
          setMitad(true);
        }
        // Y la mueve por dentro (después de abrirla, si cambió de página)
        const mov = leerMovimiento(datos.mover);
        if (mov) {
          setMitad(true);
          moverPagina(mov, !reducir);
        }
      } else {
        if (datos.error === "captcha") setPideCaptcha(true);
        if (datos.error === "ubicacion") quitarUbicacion();
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

  /** «Sí, usa mi ubicación» (cuando Paumi lo pide): permiso SOLO al tocarlo, se redondea en el teléfono y se vuelve a preguntar. */
  function cercaDeMi() {
    if (pensando || buscandoUbicacion) return;
    if (!("geolocation" in navigator)) {
      decir({ rol: "paumi", texto: "Tu navegador no me deja saber dónde estás. Dime el barrio, por ejemplo «Urdesa», y te recomiendo.", aviso: true });
      return;
    }
    setBuscandoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuscandoUbicacion(false);
        const r3 = (n: number) => Math.round(n * 1000) / 1000;
        ubicacion.current = { lat: r3(pos.coords.latitude), lng: r3(pos.coords.longitude), hasta: Date.now() + 15 * 60_000 };
        setUsandoUbicacion(true);
        void enviarTexto("¿Qué hay cerca de mí?");
      },
      (e) => {
        setBuscandoUbicacion(false);
        decir({
          rol: "paumi",
          texto:
            e.code === e.PERMISSION_DENIED
              ? "Sin permiso no sé dónde estás, ¡y está bien! Dime el barrio, por ejemplo «Urdesa» o «Samborondón», y te recomiendo."
              : "No pude saber dónde estás. Revisa que el GPS esté prendido o dime el barrio.",
          aviso: true,
        });
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  }

  const cerrar = () => setAbierto(false);

  /** Lo que dijiste en la conversación. La primera pregunta necesita el captcha: si no está, queda escrita para enviarla. */
  const enviarDicho = useEffectEvent((dicho: string) => {
    const t = dicho.slice(0, MAX_MENSAJE);
    const token = formulario.current ? new FormData(formulario.current).get("cf-turnstile-response") : null;
    if (pideCaptcha && !token) {
      setManosLibres(false);
      setTexto(t);
      textoDeVoz.current = t;
      setNotaVoz("Te escuché. Confirma que no eres un robot y toca «Enviar».");
      return;
    }
    porVoz.current = true;
    void enviarTexto(t);
  });

  // ---------- Conversación (manos libres, 2026-11-01): con la ventana abierta, te escucha sola después de cada respuesta ----------
  const escucharTurno = useEffectEvent(() => {
    let dijo = false;
    setAvisoMicrofono(null);
    setOyendo(true);
    pararMicrofono.current = escuchar({
      alParcial: (t) => setTexto(t.slice(0, MAX_MENSAJE)),
      alFinal: (dicho) => {
        dijo = true;
        silencios.current = 0;
        enviarDicho(dicho);
      },
      alError: (e) => {
        if (["not-allowed", "service-not-allowed", "not-supported", "audio-capture"].includes(e)) {
          setManosLibres(false);
          setModo("voz");
          setAvisoMicrofono(mensajeErrorMicrofono(e));
        }
      },
      alTerminar: () => {
        setOyendo(false);
        if (dijo) return;
        silencios.current += 1;
        if (silencios.current >= 4) {
          setManosLibres(false);
          setModo("voz");
          setAvisoMicrofono("Dejé de escucharte porque no dijiste nada en un rato. Toca «Conversar» para seguir.");
        } else setVuelta((n) => n + 1);
      },
    });
  });
  const conversa = manosLibres && abierto && visible && !oyendo && !voz && !pensando && !ruta.startsWith("/admin") && !ruta.startsWith("/dev");
  useEffect(() => {
    if (!conversa) return;
    const id = setTimeout(() => escucharTurno(), 400);
    return () => clearTimeout(id);
  }, [conversa, vuelta]);
  // Al cerrar la ventana o esconder la pestaña, el micrófono se apaga
  useEffect(() => {
    if (!abierto || !visible) pararMicrofono.current();
  }, [abierto, visible]);

  if (ruta.startsWith("/admin") || ruta.startsWith("/dev")) return null;
  return (
    <Dialog.Root
      open={abierto}
      onOpenChange={(a) => {
        if (a) abrir();
        else {
          setAbierto(false);
          setMitad(false);
          pararMicrofono.current();
          callar();
          setVoz(false);
        }
      }}
    >
      <Dialog.Trigger
        className={`${clasesBoton("secundario", "normal")} mle-boton-paumi fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 shadow-flotante sm:right-6 sm:bottom-6`}
      >
        <Guacamaya recorte="cabeza" animada={false} className="h-8! w-12!" />
        <span>
          <span className="max-sm:hidden">Pregúntale a </span>
          {NOMBRE}
        </span>
        {manosLibres && (
          <span className="inline-flex text-celeste-tinta" title="Conversación encendida: te escucho con la ventana abierta">
            <IconoMicrofono />
            <span className="sr-only">(conversación encendida)</span>
          </span>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={`mle-velo fixed inset-0 z-40 sm:bg-transparent ${mitad ? "bg-transparent" : "bg-[#0b1d28]/40"}`} />
        <Dialog.Content
          aria-describedby="paumi-aviso"
          className={`fixed inset-x-0 bottom-0 z-50 flex ${mitad ? "h-[55dvh]" : "h-[88dvh]"} flex-col rounded-t-[20px] border border-linea bg-papel-alto text-rio shadow-flotante sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(640px,calc(100dvh-48px))] sm:w-[400px] sm:rounded-[20px]`}
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
                aria-label="Responder con voz"
                title={sonido ? "Te respondo hablando (toca para callarme)" : "Te respondo solo con texto (toca para que hable)"}
                className="inline-grid size-11 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-rio [&_svg]:size-5"
              >
                {sonido ? <IconoSonido /> : <IconoSilencio />}
              </button>
              <Dialog.Close aria-label="Cerrar" className="inline-grid size-11 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-rio [&_svg]:size-5">
                <IconoCerrar />
              </Dialog.Close>
            </div>
          </div>

          {/* Cómo hablarle, siempre a la vista (2026-11-01) */}
          <div className="grid gap-1.5 border-b border-linea px-5 py-3">
            <p id="paumi-modo" className="m-0 text-[13px] leading-[18px] font-semibold">
              {modo ? "Cómo hablamos" : "¿Cómo quieres hablar conmigo?"}
            </p>
            <div role="radiogroup" aria-labelledby="paumi-modo" className="grid grid-cols-3 gap-1 rounded-lg bg-papel p-1">
              {(
                [
                  ["texto", "Escribir", null],
                  ["voz", "Hablar", <IconoMicrofono key="m" />],
                  ...(microfono ? ([["conversa", "Conversar", <IconoSonido key="s" />]] as const) : []),
                ] as const
              ).map(([valor, nombre, icono]) => {
                const activo = modo === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    onClick={() => elegirModo(valor)}
                    className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-md border-0 px-2 text-sm font-semibold [&_svg]:size-4 ${
                      activo ? "bg-celeste-tinta text-on-celeste-tinta" : "bg-transparent text-rio"
                    }`}
                  >
                    {icono}
                    {nombre}
                  </button>
                );
              })}
            </div>
            <p className="m-0 text-[13px] leading-[18px] text-rio-suave" aria-live="polite">
              {modo === "conversa"
                ? oyendo
                  ? "Te escucho… habla con calma; cuando hagas una pausa larga, te respondo."
                  : "Conversación: después de cada respuesta te vuelvo a escuchar sola. Solo con esta ventana abierta."
                : modo === "voz"
                  ? microfono
                    ? "Te respondo hablando. Toca el micrófono para hablarme."
                    : "Te respondo hablando (en este navegador me escribes la pregunta)."
                  : modo === "texto"
                    ? "Te respondo solo con texto."
                    : "Escribir: te respondo con texto. Hablar: te respondo con voz. Conversar: hablamos sin tocar nada."}
            </p>
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
                <Mensaje key={i} m={m} alNavegar={cerrar} ubicar={i === mensajes.length - 1 ? { alTocar: cercaDeMi, ocupado: pensando || buscandoUbicacion } : null} />
              ))}
              {pensando && <p className="m-0 max-w-[85%] self-start rounded-md bg-celeste-suave px-3.5 py-2.5 text-[15px] leading-[22px] text-rio-suave">{NOMBRE} está pensando…</p>}
            </div>
          )}

          <form ref={formulario} onSubmit={enviar} className="grid gap-2 border-t border-linea px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
            {pideCaptcha && <Captcha reiniciar={intento} />}
            {usandoUbicacion && (
              <p className="m-0 flex flex-wrap items-center gap-x-2 text-[13px] leading-[18px] text-rio-suave [&_svg]:size-4">
                <IconoUbicacion />
                Usando tu ubicación aproximada para lo de cerca (no la guardamos).
                <button type="button" onClick={quitarUbicacion} className={clasesBoton("texto", "chico", "min-h-0 px-0 underline")}>
                  Quitar
                </button>
              </p>
            )}
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

function Mensaje({ m, alNavegar, ubicar }: { m: Entrada; alNavegar: () => void; ubicar: { alTocar: () => void; ocupado: boolean } | null }) {
  if (m.rol === "usuario") return <Burbuja texto={m.texto} />;
  return (
    <div className="grid max-w-[92%] gap-2 self-start">
      <p className="m-0 rounded-md bg-celeste-suave px-3.5 py-2.5 text-[15px] leading-[22px] break-words whitespace-pre-wrap">{m.texto}</p>
      <Extras m={m} alNavegar={alNavegar} />
      {/* Versión 8: solo cuando Paumi lo pide, y solo en su última respuesta */}
      {m.pedirUbicacion && ubicar && (
        <button type="button" onClick={ubicar.alTocar} disabled={ubicar.ocupado} className={clasesBoton("secundario", "chico", "justify-self-start gap-1.5 [&_svg]:size-4")}>
          <IconoUbicacion />
          Sí, usa mi ubicación
        </button>
      )}
    </div>
  );
}

/** Lugar de internet (fuera de la guía): sin foto ni ficha; Google Maps da la dirección real y se ve de dónde salió. */
function TarjetaExterna({ x }: { x: ExternoPaumi }) {
  return (
    <article className="grid gap-1 rounded-md border border-dashed border-linea-fuerte bg-papel-alto p-3">
      <h3 className="m-0 text-[15px] leading-5 font-semibold break-words">{x.nombre}</h3>
      <p className="m-0 text-[13px] leading-[18px] text-rio-suave">
        {x.sector ? `${x.sector}. ` : ""}
        {x.origen === "guia-util"
          ? "Lugar de referencia de nuestra Guía útil (datos de OpenStreetMap)."
          : `No está en nuestra guía: lo encontré en ${x.fuente.sitio}. Confirma horarios y precios antes de ir.`}
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
