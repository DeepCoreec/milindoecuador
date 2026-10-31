"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CercaEvento, CercaLugar, CercaSitio, ResultadoCerca } from "@/lib/cerca";
import { clasesBoton } from "@/components/ui/Boton";
import { IconoUbicacion } from "@/components/ui/iconos";

/*
 * Botón "Cerca de mí" del buscador (versión 8, fase 34.2). Pide permiso al navegador SOLO al tocarlo (o al llegar desde
 * el enlace "Cerca de mí" de la portada); si la persona no lo da, todo sigue igual. La ubicación se manda al servidor
 * por POST, redondeada, y no se guarda en ninguna parte (ni en el navegador).
 */

type Estado = { fase: "inicio" } | { fase: "buscando" } | { fase: "error"; mensaje: string } | { fase: "listo"; r: ResultadoCerca };

const distancia = (m: number) => (m < 1000 ? `a ${Math.max(100, Math.round(m / 50) * 50)} m` : `a ${(Math.round(m / 100) / 10).toLocaleString("es-EC")} km`);

function Miniatura({ foto }: { foto: { src: string; alt: string } | null }) {
  if (!foto) return null;
  return <Image src={foto.src} alt={foto.alt} width={72} height={72} sizes="72px" className="size-[72px] flex-none rounded-lg object-cover" />;
}

function Negocio({ l }: { l: CercaLugar }) {
  return (
    <li className="flex gap-3 rounded-xl border border-linea bg-papel-alto p-3">
      <Miniatura foto={l.foto} />
      <div className="grid min-w-0 content-start gap-0.5">
        <Link href={l.ruta} className="font-semibold">
          {l.nombre}
        </Link>
        <span className="text-sm leading-5 text-rio-suave">
          {l.categoria} · {l.sector} · <b className="font-semibold text-rio">{distancia(l.distancia)}</b>
        </span>
        {l.estado && <span className={`text-sm leading-5 ${l.abierto ? "text-exito" : "text-rio-suave"}`}>{l.estado}</span>}
        <a href={l.comoLlegar} target="_blank" rel="noopener noreferrer" className="text-sm leading-5" aria-label={`Cómo llegar a ${l.nombre}`}>
          Cómo llegar
        </a>
      </div>
    </li>
  );
}

function Evento({ e }: { e: CercaEvento }) {
  return (
    <li className="grid gap-0.5 rounded-xl border border-linea bg-papel-alto p-3">
      <Link href={e.ruta} className="font-semibold">
        {e.titulo}
      </Link>
      <span className="text-sm leading-5 text-rio-suave">{e.cuando}</span>
      <span className="text-sm leading-5 text-rio-suave">
        {e.donde ? `${e.donde} · ` : ""}
        <b className="font-semibold text-rio">{distancia(e.distancia)}</b> · {e.precio}
      </span>
      <a href={e.comoLlegar} target="_blank" rel="noopener noreferrer" className="text-sm leading-5" aria-label={`Cómo llegar a ${e.titulo}`}>
        Cómo llegar
      </a>
    </li>
  );
}

function Sitio({ s }: { s: CercaSitio }) {
  return (
    <li className="flex gap-3 rounded-xl border border-linea bg-papel-alto p-3">
      <Miniatura foto={s.foto} />
      <div className="grid min-w-0 content-start gap-0.5">
        <b className="font-semibold">{s.nombre}</b>
        <span className="text-sm leading-5 text-rio-suave">
          {s.tipo} · <b className="font-semibold text-rio">{distancia(s.distancia)}</b>
        </span>
        <a href={s.comoLlegar} target="_blank" rel="noopener noreferrer" className="text-sm leading-5" aria-label={`Cómo llegar a ${s.nombre}`}>
          Cómo llegar
        </a>
      </div>
    </li>
  );
}

function Grupo({ id, titulo, children, vacio }: { id: string; titulo: string; children: React.ReactNode[]; vacio: string }) {
  return (
    <section aria-labelledby={id} className="grid content-start gap-3">
      <h3 id={id} className="m-0 font-rotulo text-xl leading-[26px] font-normal">
        {titulo}
      </h3>
      {children.length ? <ul className="m-0 grid list-none gap-3 p-0">{children}</ul> : <p className="m-0 text-sm text-rio-suave">{vacio}</p>}
    </section>
  );
}

export function CercaDeMi({ autoIniciar = false }: { autoIniciar?: boolean }) {
  const [estado, setEstado] = useState<Estado>({ fase: "inicio" });
  const titulo = useRef<HTMLHeadingElement>(null);

  const buscar = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setEstado({ fase: "error", mensaje: "Tu navegador no puede dar tu ubicación. Busca por barrio, por ejemplo «Urdesa»." });
      return;
    }
    setEstado({ fase: "buscando" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch("/api/cerca", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          });
          const datos = (await r.json()) as ResultadoCerca & { error?: string };
          if (!r.ok) throw new Error(datos.error ?? "error");
          setEstado({ fase: "listo", r: datos });
          requestAnimationFrame(() => titulo.current?.focus());
        } catch (e) {
          setEstado({
            fase: "error",
            mensaje: e instanceof Error && /Ecuador/.test(e.message) ? "Parece que no estás en Ecuador: «Cerca de mí» funciona en Guayaquil." : "No se pudo buscar ahora. Intenta de nuevo.",
          });
        }
      },
      (e) =>
        setEstado({
          fase: "error",
          mensaje:
            e.code === e.PERMISSION_DENIED
              ? "No diste permiso para usar tu ubicación. Puedes buscar por barrio, por ejemplo «Urdesa» o «Samborondón»."
              : "No se pudo saber dónde estás. Revisa que el GPS esté prendido e intenta de nuevo.",
        }),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  // Desde el enlace "Cerca de mí" de la portada: la persona ya lo pidió con ese toque
  // Si ya dio permiso antes, busca de una; si no, destaca el botón y espera su toque (sin abrir el aviso del navegador
  // al cargar la página: revisión del 2026-10-30, hallazgo 5)
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!autoIniciar) return;
    let vivo = true;
    const consulta = navigator.permissions?.query({ name: "geolocation" });
    if (!consulta) {
      boton.current?.focus();
      return;
    }
    consulta
      .then((p) => {
        if (!vivo) return;
        if (p.state === "granted") buscar();
        else boton.current?.focus();
      })
      .catch(() => boton.current?.focus());
    return () => {
      vivo = false;
    };
  }, [autoIniciar, buscar]);

  const r = estado.fase === "listo" ? estado.r : null;
  return (
    <section aria-label="Cerca de mí" className="mt-6 grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          ref={boton}
          type="button"
          onClick={() => estado.fase !== "buscando" && buscar()}
          aria-disabled={estado.fase === "buscando"}
          className={`${clasesBoton(autoIniciar && estado.fase === "inicio" ? "principal" : "secundario")} gap-2 [&_svg]:size-5`}
        >
          <IconoUbicacion />
          {estado.fase === "buscando" ? "Buscando cerca de ti…" : r ? "Volver a buscar cerca de mí" : "Cerca de mí"}
        </button>
        <span className="text-sm text-rio-suave">
          Usa tu ubicación aproximada solo para esta búsqueda. No la guardamos. <Link href="/legal/privacidad">Privacidad</Link>
        </span>
      </div>
      {/* Aviso corto en vivo (lo lee el lector de pantalla); los resultados no van en la región en vivo */}
      <p role="status" className="sr-only">
        {estado.fase === "buscando" ? "Buscando lugares cerca de ti" : r ? `Listo: ${r.lugares.length + r.eventos.length + r.sitios.length} resultados cerca de ti` : ""}
      </p>
      <div>
        {estado.fase === "error" && (
          <p role="alert" className="m-0 font-semibold text-error">
            {estado.mensaje}
          </p>
        )}
        {r && (
          <div className="grid gap-6">
            <h2 ref={titulo} tabIndex={-1} className="m-0 font-rotulo text-[26px] leading-8 font-normal outline-none md:text-[32px] md:leading-10">
              Lo que hay cerca <span className="font-sans text-lg text-rio-suave">(hasta {r.radio / 1000} km)</span>
            </h2>
            {r.lugares.length + r.eventos.length + r.sitios.length === 0 ? (
              <p className="m-0 text-rio-suave">No encontramos lugares cerca. «Cerca de mí» funciona en Guayaquil: prueba buscar por barrio o explora por categoría.</p>
            ) : (
              <div className="grid gap-8 lg:grid-cols-3">
                <Grupo id="t-cerca-negocios" titulo="Negocios" vacio="No hay negocios registrados cerca todavía.">
                  {r.lugares.map((l) => (
                    <Negocio key={l.id} l={l} />
                  ))}
                </Grupo>
                <Grupo id="t-cerca-eventos" titulo="Eventos de esta semana" vacio="No hay eventos cerca esta semana.">
                  {r.eventos.map((e) => (
                    <Evento key={e.ruta} e={e} />
                  ))}
                </Grupo>
                <Grupo id="t-cerca-visitar" titulo="Para visitar" vacio="No hay lugares de la guía cerca.">
                  {r.sitios.map((s) => (
                    <Sitio key={s.id} s={s} />
                  ))}
                </Grupo>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
