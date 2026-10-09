import { clasesBoton } from "@/components/ui/Boton";
import { IconoEnlaceExterno } from "@/components/ui/iconos";
import { LISTA_REDES, nombreSitio, REDES, type Enlaces } from "@/lib/redes";

/**
 * "Síguenos" (versión 3, paso 11.2): redes y página web del negocio. Se abren en la app o en otra pestaña.
 * `nofollow ugc`: los enlaces los pone el dueño; Google no debe tomarlos como recomendación nuestra.
 * Sin logos de las marcas: el nombre de cada red y un ícono genérico de "enlace externo".
 */
export function RedesLugar({ enlaces, nombre }: { enlaces: Enlaces; nombre: string }) {
  const lista = LISTA_REDES.filter((red) => enlaces[red]);
  if (!lista.length) return null;
  return (
    <section aria-labelledby="t-redes" className="grid gap-2">
      <h3 id="t-redes" className="m-0 text-[15px] leading-[22px] font-semibold">
        Síguenos
      </h3>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {lista.map((red) => (
          <li key={red}>
            <a
              href={enlaces[red]}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className={clasesBoton("secundario", "chico", "gap-2")}
              aria-label={`${red === "web" ? `Página web: ${nombreSitio(enlaces[red]!)}` : REDES[red].etiqueta} de ${nombre} (se abre en otra pestaña)`}
            >
              {red === "web" ? nombreSitio(enlaces[red]!) : REDES[red].etiqueta}
              <IconoEnlaceExterno />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
