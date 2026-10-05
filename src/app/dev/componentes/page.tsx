import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Panorama } from "@/components/arte/Panorama";
import { Buscador } from "@/components/busqueda/Buscador";
import { BarraCategorias } from "@/components/categorias/BarraCategorias";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { Estrellas } from "@/components/lugares/Estrellas";
import { TarjetaLugar } from "@/components/lugares/TarjetaLugar";
import { Boton } from "@/components/ui/Boton";
import { Insignia } from "@/components/ui/Insignia";
import { IconoCompartir, IconoConversacion } from "@/components/ui/iconos";
import { getCategoriasBarra } from "@/lib/datos/inicio";

/*
 * Muestrario de componentes. Solo existe en desarrollo (npm run dev):
 * en producción responde 404 y no se indexa.
 * Los negocios son de ejemplo (inventados); los lugares turísticos son reales.
 */

export const metadata: Metadata = { title: "Componentes · Mi Lindo Ecuador", robots: { index: false, follow: false } };

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-linea py-8">
      <h2 className="m-0 font-rotulo text-lg leading-6 font-normal text-rio">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function PaginaComponentes() {
  if (process.env.NODE_ENV === "production") notFound();
  const categorias = await getCategoriasBarra();

  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-12 md:px-8">
        <h1 className="mt-8 mb-2 font-rotulo text-[28px] leading-9 font-normal text-rio">Componentes</h1>
        <p className="m-0 mb-6 max-w-prose text-base text-rio-suave">
          Muestrario solo para desarrollo. Cambia el modo claro u oscuro desde tu sistema para revisar los dos.
        </p>

        <Seccion titulo="Panorama">
          <Panorama className="aspect-[12/5] w-full rounded-lg" />
        </Seccion>

        <Seccion titulo="Botones">
          <div className="flex flex-wrap items-center gap-3">
            <Boton variante="principal">Escribir reseña</Boton>
            <Boton>Ver en el mapa</Boton>
            <Boton variante="whatsapp">
              <IconoConversacion />
              Escribir por WhatsApp
            </Boton>
            <Boton variante="texto">
              <IconoCompartir />
              Compartir
            </Boton>
            <Boton tamano="chico">Chico</Boton>
            <Boton disabled>Desactivado</Boton>
            <Boton href="/guayaquil" variante="secundario">
              Enlace con forma de botón
            </Boton>
          </div>
        </Seccion>

        <Seccion titulo="Insignias y estrellas">
          <div className="flex flex-wrap items-center gap-3">
            <Insignia variante="destacado">Destacado</Insignia>
            <Insignia variante="verificado">Verificado</Insignia>
            <Insignia>Entrada libre</Insignia>
            <Insignia variante="ejemplo">Ejemplo</Insignia>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Estrellas promedio={4.6} cantidad={128} />
            <Estrellas promedio={4} cantidad={1} />
            <Estrellas promedio={null} cantidad={0} />
          </div>
        </Seccion>

        <Seccion titulo="Buscador">
          <Buscador />
        </Seccion>

        <Seccion titulo="Barra de categorías">
          <BarraCategorias categorias={categorias} activa="restaurantes" />
        </Seccion>

        <Seccion titulo="Tarjetas de lugar">
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            <TarjetaLugar
              href="/guayaquil/restaurantes/ejemplo-encebollados"
              nombre="Encebollados La Esquina"
              datos="Restaurante en Urdesa"
              promedio={4.7}
              cantidad={86}
              precio={1}
              tono="mango"
              insignias={
                <>
                  <Insignia variante="destacado">Destacado</Insignia>
                  <Insignia variante="ejemplo">Ejemplo</Insignia>
                </>
              }
            />
            <TarjetaLugar
              href="/guayaquil/hoteles/ejemplo-hostal"
              nombre="Hostal Las Peñas"
              datos="Hotel en el barrio Las Peñas"
              promedio={4.3}
              cantidad={21}
              precio={2}
              insignias={
                <>
                  <Insignia variante="verificado">Verificado</Insignia>
                  <Insignia variante="ejemplo">Ejemplo</Insignia>
                </>
              }
            />
            <TarjetaLugar
              href="/guayaquil/turismo/malecon-2000"
              nombre="Malecón 2000"
              datos="Paseo junto al río Guayas, centro"
              promedio={4.8}
              cantidad={312}
              extra={<Insignia>Entrada libre</Insignia>}
            />
            <TarjetaLugar
              href="/guayaquil/turismo/parque-seminario"
              nombre="Parque Seminario"
              datos="Parque de las iguanas, centro"
              promedio={null}
              cantidad={0}
              tono="mango"
              extra={<Insignia>Entrada libre</Insignia>}
            />
          </div>
        </Seccion>
      </main>
      <Pie />
    </>
  );
}
