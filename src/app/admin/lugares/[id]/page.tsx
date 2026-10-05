import Link from "next/link";
import { notFound } from "next/navigation";
import { FormLugar, type DatosFormLugar } from "@/components/admin/FormLugar";
import { getLugarAdmin } from "@/lib/datos/admin";
import { getCategorias } from "@/lib/datos/lugares";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Crear (id = "nuevo") o editar una ficha. */
export default async function EditarLugar({ params, searchParams }: PageProps<"/admin/lugares/[id]">) {
  const { id } = await params;
  const guardado = (await searchParams).guardado === "1";
  if (id !== "nuevo" && !UUID.test(id)) notFound();
  const categorias = (await getCategorias()).map(({ slug, nombre }) => ({ slug, nombre }));

  let datos: DatosFormLugar;
  let enlace: string | null = null;
  if (id === "nuevo") {
    datos = { id, nombre: "", categoria: categorias[0]?.slug ?? "", sector: "", descripcion: "", dato: "", horario: "", direccion: "", precio: "", whatsapp: "", estado: "borrador" };
  } else {
    const l = await getLugarAdmin(id);
    if (!l) notFound();
    const categoria = l.categories?.slug ?? "";
    datos = {
      id: l.id,
      nombre: l.name,
      categoria,
      sector: l.sector,
      descripcion: l.description,
      dato: l.short_fact ?? "",
      horario: l.hours ?? "",
      direccion: l.address ?? "",
      precio: l.price_level ? String(l.price_level) : "",
      whatsapp: l.whatsapp ? l.whatsapp.replace(/^593/, "0") : "",
      estado: l.status,
    };
    if (l.status === "publicado") enlace = `/guayaquil/${categoria}/${l.slug}`;
  }

  return (
    <div className="grid max-w-[880px] gap-6">
      <div className="grid gap-2">
        <Link href="/admin/lugares" className="text-sm leading-5 text-rio-suave">
          ← Lugares
        </Link>
        <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">{id === "nuevo" ? "Nuevo lugar" : datos.nombre}</h1>
        {enlace && (
          <Link href={enlace} target="_blank" className="text-sm leading-5">
            Ver la ficha publicada
          </Link>
        )}
        {guardado && (
          <p role="status" className="m-0 text-sm leading-5 font-semibold text-exito">
            Ficha creada. Ahora súbele fotos y publícala.
          </p>
        )}
      </div>
      <FormLugar lugar={datos} categorias={categorias} />
    </div>
  );
}
