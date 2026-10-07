import { Palabras } from "@/components/admin/Palabras";
import { getPalabras } from "@/lib/datos/admin";

/** Moderación automática: la lista de palabras que no se permiten en fichas, reseñas y nombres (paso 9.1). */
export default async function PaginaPalabras() {
  const palabras = await getPalabras();
  return (
    <>
      <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Palabras prohibidas</h1>
      <p className="mt-2 mb-6 max-w-[64ch] text-rio-suave">
        Antes de guardar una ficha, una reseña, una respuesta o un nombre, la base revisa que no tenga estas palabras. En descripciones, reseñas y respuestas
        tampoco deja poner enlaces ni números de teléfono. Lo que se escape lo frenan los reportes de la gente.
      </p>
      <Palabras palabras={palabras} />
    </>
  );
}
