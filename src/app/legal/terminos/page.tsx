import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/PaginaLegal";
import { mostrarWhatsApp } from "@/lib/enlaces";
import { RESPONSABLE } from "@/lib/legal";
import { paraCompartir } from "@/lib/sitio";

const descripcion = "Las reglas para usar Mi Lindo Ecuador, escribir reseñas y publicar un negocio.";
export const metadata: Metadata = { title: "Términos de uso · Mi Lindo Ecuador", description: descripcion, ...paraCompartir("Términos de uso", descripcion, "/legal/terminos") };

/*
 * Borrador en lenguaje simple. Antes del lanzamiento: completar los datos de src/lib/legal.ts
 * y que lo revise un abogado.
 */
export default function Terminos() {
  const r = RESPONSABLE;
  return (
    <PaginaLegal
      titulo="Términos de uso"
      resumen="En corto: la guía es gratis para todos. Escribe reseñas honestas de lugares que visitaste, sin insultos ni publicidad. Los negocios publican datos reales. Confirma horarios y precios con el negocio antes de ir."
    >
      <section>
        <h2>Quiénes somos</h2>
        <p>
          Mi Lindo Ecuador es una guía de lugares de Guayaquil, un proyecto de {r.nombre} ({r.razonSocial}, RUC {r.ruc}), {r.ciudad}. Contacto:{" "}
          {r.correo} o WhatsApp {mostrarWhatsApp(r.whatsapp)}. Al usar la página aceptas estos términos y la{" "}
          <Link href="/legal/privacidad">política de privacidad</Link>.
        </p>
      </section>

      <section>
        <h2>La información de los lugares</h2>
        <p>
          Hacemos lo posible para que horarios, precios y direcciones estén al día, pero pueden cambiar sin aviso. Antes de ir, confirma con el
          negocio, por ejemplo con su botón de WhatsApp. Lo que pase en cada lugar es responsabilidad del lugar.
        </p>
      </section>

      <section>
        <h2>Reglas para las reseñas</h2>
        <ul>
          <li>Escribe solo de lugares que visitaste, con tu propia experiencia.</li>
          <li>Sin insultos, amenazas, discriminación ni contenido sexual.</li>
          <li>Sin publicidad, enlaces de venta ni reseñas pagadas o a cambio de algo.</li>
          <li>Sin datos personales de otras personas (nombres completos, teléfonos, fotos de empleados).</li>
          <li>Un negocio no puede reseñarse a sí mismo ni a su competencia.</li>
        </ul>
        <p className="mt-3">
          Cualquiera puede reportar una reseña. Las que no cumplan estas reglas se ocultan. Una opinión honesta, aunque sea mala, se mantiene. Puede
          haber un límite de reseñas por día para frenar el spam.
        </p>
      </section>

      <section>
        <h2>Negocios</h2>
        <ul>
          <li>Aparecer en la guía es gratis. Los datos que envías deben ser reales y estar a tu nombre o al de tu negocio.</li>
          <li>Tu ficha se crea al instante y tú decides cuándo publicarla. Podemos revisarla después y ocultarla o borrarla si rompe estas reglas o si la gente la reporta.</li>
          <li>
            Los planes Destacado y Verificado se pagan por transferencia o DeUna y se activan cuando confirmamos el pago. Destacado hace que tu
            ficha salga primero en su categoría durante el tiempo pagado; no cambia tus reseñas ni tu calificación. Ver{" "}
            <Link href="/negocios/planes">planes</Link>.
          </li>
          <li>Si quieres responder una reseña de tu negocio, escríbenos y publicamos tu respuesta debajo. No quitamos reseñas a pedido ni a cambio de pago.</li>
        </ul>
      </section>

      <section>
        <h2>Fotos, videos y textos</h2>
        <p>
          Las fotos y videos de la guía son propios o de los negocios que los subieron. Al subir fotos, videos o textos nos das permiso para
          mostrarlos en la guía y en los enlaces para compartirla. No copies ni uses las fotos o videos de la guía para otros fines sin permiso.
        </p>
        <p>
          Cada negocio puede subir un video. Tiene que ser de su propio negocio y no puede tener contenido sexual, violento, engañoso ni música u
          otro material de terceros sin permiso. Sale al instante; si varias personas lo reportan, se oculta hasta que lo revisemos, y podemos
          borrarlo si no cumple estas reglas. Los enlaces a redes y páginas web son responsabilidad de cada negocio.
        </p>
      </section>

      <section>
        <h2>Paumi, la guía con inteligencia artificial</h2>
        <p>
          Paumi es una guacamaya guía hecha con inteligencia artificial (Claude, de la empresa Anthropic). Recomienda lugares de la guía y responde
          preguntas sobre Ecuador. <b>Puede equivocarse:</b> revisa los datos importantes (horarios, precios, direcciones) en la ficha de cada lugar
          antes de ir. Si un lugar no está en la guía, puede sugerir opciones que encuentra en sitios confiables de internet (te lo dice y
          muestra la fuente); esas no las revisamos nosotros. Sus respuestas no son consejos profesionales. Úsala con respeto: tiene un límite de mensajes por día y puede dejar de responder
          si se abusa de ella.
        </p>
        <p>
          Para hablarle, ábrela con el botón de la esquina y escríbele, o toca el <b>micrófono</b> y habla (tu navegador te pedirá permiso; solo
          escucha mientras el micrófono está encendido). Si le preguntas hablando, te responde con la voz de tu teléfono; puedes apagar el sonido
          cuando quieras. Con <b>manos libres</b> (lo activas tú dentro de la ventana de Paumi) basta con decir «Paumi» y lo que buscas, mientras la
          página está abierta y a la vista; el botón de Paumi muestra un micrófono mientras está encendido.
        </p>
      </section>

      <section>
        <h2>Tu cuenta</h2>
        <p>
          Cuida el acceso a tu correo, porque con él se entra a tu cuenta. Podemos suspender cuentas que rompan estas reglas. Puedes borrar tu
          cuenta cuando quieras en <Link href="/cuenta">Mi cuenta</Link>.
        </p>
      </section>

      <section>
        <h2>Cambios y ley aplicable</h2>
        <p>
          Si cambiamos estos términos, actualizamos la fecha de arriba. Se rigen por las leyes de Ecuador; cualquier diferencia se resolverá ante
          los jueces de {r.ciudad.split(",")[0]}.
        </p>
      </section>
    </PaginaLegal>
  );
}
