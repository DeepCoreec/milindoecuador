import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/PaginaLegal";
import { mostrarWhatsApp } from "@/lib/enlaces";
import { RESPONSABLE } from "@/lib/legal";
import { paraCompartir } from "@/lib/sitio";

const descripcion = "Qué datos guarda Mi Lindo Ecuador, para qué los usa y cómo borrarlos.";
export const metadata: Metadata = { title: "Política de privacidad · Mi Lindo Ecuador", description: descripcion, ...paraCompartir("Política de privacidad", descripcion, "/legal/privacidad") };

/*
 * Borrador en lenguaje simple. Antes del lanzamiento: completar los datos de src/lib/legal.ts
 * y que lo revise un abogado (Ley Orgánica de Protección de Datos Personales de Ecuador).
 */
export default function Privacidad() {
  const r = RESPONSABLE;
  return (
    <PaginaLegal
      titulo="Política de privacidad"
      resumen="En corto: guardamos lo mínimo para que tengas una cuenta y puedas escribir reseñas. No vendemos tus datos, no mostramos publicidad y puedes borrar tu cuenta cuando quieras desde «Mi cuenta»."
    >
      <section>
        <h2>Quién es el responsable</h2>
        <p>
          Mi Lindo Ecuador es un proyecto de {r.nombre} ({r.razonSocial}, RUC {r.ruc}), con domicilio en {r.ciudad}. Para cualquier tema de
          privacidad escríbenos a {r.correo} o por WhatsApp al {mostrarWhatsApp(r.whatsapp)}.
        </p>
      </section>

      <section>
        <h2>Qué datos guardamos</h2>
        <ul>
          <li>
            <b>Tu cuenta:</b> tu correo y tu nombre visible. Si entras con Google, Google nos comparte tu nombre, tu correo y tu foto de perfil; solo
            mostramos el nombre visible (por ejemplo, «Juan P.»), que puedes cambiar en <Link href="/cuenta">Mi cuenta</Link>.
          </li>
          <li>
            <b>Tus reseñas:</b> las estrellas, el texto y la fecha. Son públicas y se muestran con tu nombre visible.
          </li>
          <li>
            <b>Tus reportes:</b> el motivo por el que reportas una reseña. Solo lo ve el equipo que modera.
          </li>
          <li>
            <b>Solicitudes de negocios:</b> el nombre del negocio, su categoría y sector, el nombre de quien la envía, el WhatsApp y la descripción. El
            WhatsApp del negocio se publica en su ficha para que los clientes le escriban.
          </li>
          <li>
            <b>Datos técnicos:</b> las cookies que mantienen tu sesión abierta y la dirección IP que usa el captcha para distinguir personas de robots.
            No usamos cookies de publicidad ni de seguimiento.
          </li>
        </ul>
      </section>

      <section>
        <h2>Para qué los usamos</h2>
        <ul>
          <li>Para que puedas entrar a tu cuenta y publicar, editar o borrar tus reseñas.</li>
          <li>Para revisar las solicitudes de negocios y escribirles por WhatsApp.</li>
          <li>Para cuidar la guía: frenar el spam, revisar reportes y ocultar lo que no cumple las reglas.</li>
        </ul>
        <p className="mt-3">No vendemos ni alquilamos tus datos, y no los usamos para publicidad.</p>
      </section>

      <section>
        <h2>Con quién se comparten</h2>
        <p>Usamos servicios de otras empresas para que la guía funcione. Ellos guardan o procesan datos por nosotros, solo para eso:</p>
        <ul className="mt-2">
          <li>Supabase: la base de datos, las cuentas, las fotos y los videos.</li>
          <li>Vercel: el servidor donde vive la página.</li>
          <li>Cloudflare Turnstile: el captcha de los formularios.</li>
          <li>Google: solo si eliges entrar con Google.</li>
        </ul>
        <p className="mt-3">Estos servicios pueden guardar los datos fuera de Ecuador.</p>
      </section>

      <section>
        <h2>Cuánto tiempo los guardamos</h2>
        <p>
          Mientras tu cuenta exista. Si la borras, se eliminan al momento tu cuenta, tu nombre visible, tus reseñas y tus reportes. Las solicitudes
          de negocios se guardan mientras el negocio esté en la guía o haga falta para responder a la solicitud.
        </p>
      </section>

      <section>
        <h2>Tus derechos</h2>
        <p>
          Según la Ley Orgánica de Protección de Datos Personales de Ecuador, puedes pedir ver, corregir o borrar tus datos, oponerte a su uso o
          pedir una copia. Lo más rápido: en <Link href="/cuenta">Mi cuenta</Link> cambias tu nombre y borras tu cuenta tú mismo. Para lo demás,
          escríbenos y respondemos en un plazo razonable.
        </p>
      </section>

      <section>
        <h2>Edad</h2>
        <p>Para crear una cuenta debes tener 18 años o más, o el permiso de tu madre, padre o representante.</p>
      </section>

      <section>
        <h2>Cambios</h2>
        <p>Si cambiamos esta política, actualizamos la fecha de arriba. Si el cambio es importante, lo avisaremos en la página.</p>
      </section>
    </PaginaLegal>
  );
}
