"use client";

import { useActionState, type ReactNode } from "react";
import { guardarLugar, type EstadoLugar } from "@/acciones/admin";
import { guardarMiNegocio } from "@/acciones/dueno";
import { clasesBoton } from "@/components/ui/Boton";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";
import { CampoHorario } from "./CampoHorario";
import { CampoUbicacion } from "./CampoUbicacion";

const inicial: EstadoLugar = { estado: "inicio" };

export type DatosFormLugar = {
  id: string;
  nombre: string;
  categoria: string;
  sector: string;
  descripcion: string;
  dato: string;
  horario: string;
  direccion: string;
  /** Coordenadas como texto: "-2.189400, -79.880800" (o vacío). */
  ubicacion: string;
  /** Horario por día como JSON (o vacío), versión 2. */
  horarioDias: string;
  precio: string;
  whatsapp: string;
  estado: "borrador" | "publicado" | "oculto";
};

function Campo({ id, etiqueta, ayuda, children }: { id: string; etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      {children}
      {ayuda && <p className={`m-0 ${claseAyuda}`}>{ayuda}</p>}
    </div>
  );
}

/**
 * Crear o editar una ficha. `modo="dueno"` (versión 2, "Mi negocio"): sin categoría ni estado
 * (eso lo maneja el admin y el botón Publicar), y guarda con las acciones del dueño.
 */
export function FormLugar({
  lugar,
  categorias = [],
  modo = "admin",
}: {
  lugar: DatosFormLugar;
  categorias?: { slug: string; nombre: string }[];
  modo?: "admin" | "dueno";
}) {
  const dueno = modo === "dueno";
  const [estado, accion, guardando] = useActionState(dueno ? guardarMiNegocio : guardarLugar, inicial);
  const v = { ...lugar, ...(estado.valores ?? {}) } as DatosFormLugar;
  // Tras un error, los campos vuelven con lo escrito (la acción lo devuelve en `valores`)
  return (
    <form key={estado.intento ?? 0} action={accion} noValidate className="grid gap-5 rounded-xl border border-linea bg-papel-alto p-6">
      <input type="hidden" name={dueno ? "lugar" : "id"} value={lugar.id} />
      <Campo id="l-nombre" etiqueta="Nombre">
        <input id="l-nombre" name="nombre" required maxLength={120} defaultValue={v.nombre} className={claseEntrada} />
      </Campo>
      <div className={`grid gap-5 ${dueno ? "" : "sm:grid-cols-2"}`}>
        {!dueno && (
          <Campo id="l-categoria" etiqueta="Categoría">
            <select id="l-categoria" name="categoria" defaultValue={v.categoria} className={`mle-select ${claseEntrada} pr-10`}>
              {categorias.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo id="l-sector" etiqueta="Sector" ayuda="Así aparece en el filtro: Centro, Urdesa, Alborada…">
          <input id="l-sector" name="sector" required maxLength={80} defaultValue={v.sector} className={claseEntrada} />
        </Campo>
      </div>
      <Campo id="l-descripcion" etiqueta="La historia" ayuda="De 20 a 2000 caracteres. Cuenta qué tiene de especial, no solo la dirección.">
        <textarea id="l-descripcion" name="descripcion" rows={6} maxLength={2000} defaultValue={v.descripcion} className={`${claseEntrada} resize-y`} />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="l-dato" etiqueta="Dato corto (opcional)" ayuda="Se ve en la tarjeta cuando no hay precio: «Entrada libre».">
          <input id="l-dato" name="dato" maxLength={80} defaultValue={v.dato} className={claseEntrada} />
        </Campo>
        <Campo id="l-horario" etiqueta="Horario (opcional)">
          <input
            id="l-horario"
            name="horario"
            maxLength={120}
            defaultValue={v.horario}
            placeholder="Martes a domingo, de 12:00 a 22:00"
            className={claseEntrada}
          />
        </Campo>
      </div>
      <Campo id="l-direccion" etiqueta="Dirección (opcional)">
        <input id="l-direccion" name="direccion" maxLength={200} defaultValue={v.direccion} className={claseEntrada} />
      </Campo>
      <CampoUbicacion id="l-ubicacion" valor={v.ubicacion} />
      <CampoHorario valor={v.horarioDias} />
      <div className={`grid gap-5 ${dueno ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <Campo id="l-precio" etiqueta="Precio">
          <select id="l-precio" name="precio" defaultValue={v.precio} className={`mle-select ${claseEntrada} pr-10`}>
            <option value="">Sin precio</option>
            <option value="1">$ económico</option>
            <option value="2">$$ medio</option>
            <option value="3">$$$ alto</option>
          </select>
        </Campo>
        <Campo id="l-whatsapp" etiqueta="WhatsApp (opcional)">
          <input id="l-whatsapp" name="whatsapp" inputMode="tel" maxLength={20} defaultValue={v.whatsapp} placeholder="099 123 4567" className={claseEntrada} />
        </Campo>
        {!dueno && (
          <Campo id="l-estado" etiqueta="Estado">
            <select id="l-estado" name="estado" defaultValue={v.estado} className={`mle-select ${claseEntrada} pr-10`}>
              <option value="borrador">Borrador (no se ve)</option>
              <option value="publicado">Publicado</option>
              <option value="oculto">Oculto</option>
            </select>
          </Campo>
        )}
      </div>
      {estado.estado === "error" && (
        <div role="alert" className="grid gap-1 text-sm leading-5 text-error">
          <b>{estado.mensaje}</b>
          {estado.errores?.map((e) => (
            <span key={e}>{e}</span>
          ))}
        </div>
      )}
      {estado.estado === "ok" && (
        <p role="status" className="m-0 text-sm leading-5 font-semibold text-exito">
          {estado.mensaje}
        </p>
      )}
      <button type="submit" disabled={guardando} className={clasesBoton("principal", "normal", "justify-self-start")}>
        {guardando ? "Guardando…" : lugar.id === "nuevo" ? "Crear ficha" : dueno ? "Guardar datos" : "Guardar cambios"}
      </button>
    </form>
  );
}
