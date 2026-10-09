import Link from "next/link";
import { notFound } from "next/navigation";
import { FormLugar, type DatosFormLugar } from "@/components/admin/FormLugar";
import { FotosLugar } from "@/components/admin/FotosLugar";
import { VideoNegocio } from "@/components/admin/VideoNegocio";
import { PlanLugar } from "@/components/admin/PlanLugar";
import { configSupabase } from "@/lib/supabase/config";
import { ResenaAdmin } from "@/components/admin/ResenaAdmin";
import { getFotosAdmin, getLugarAdmin, getResenasDeLugar, type FotoAdmin, type ResenaAdmin as DatosResena } from "@/lib/datos/admin";
import { getCategorias } from "@/lib/datos/lugares";
import { getVideoPrivado, type VideoLugar } from "@/lib/datos/video";
import { destacadoVigente } from "@/lib/planes";
import { leerHorario } from "@/lib/horario";
import { textoUbicacion } from "@/lib/ubicacion";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Crear (id = "nuevo") o editar una ficha. */
export default async function EditarLugar({ params, searchParams }: PageProps<"/admin/lugares/[id]">) {
  const { id } = await params;
  const guardado = (await searchParams).guardado === "1";
  if (id !== "nuevo" && !UUID.test(id)) notFound();
  const categorias = (await getCategorias()).map(({ slug, nombre }) => ({ slug, nombre }));

  let datos: DatosFormLugar;
  let enlace: string | null = null;
  let fotos: FotoAdmin[] = [];
  let video: VideoLugar | null = null;
  let resenas: DatosResena[] = [];
  let plan = { vigente: false, destacadoHasta: null as string | null, verificado: false };
  if (id === "nuevo") {
    datos = { id, nombre: "", categoria: categorias[0]?.slug ?? "", sector: "", descripcion: "", dato: "", horario: "", direccion: "", ubicacion: "", horarioDias: "", precio: "", whatsapp: "", web: "", facebook: "", instagram: "", tiktok: "", youtube: "", estado: "borrador" };
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
      ubicacion: l.latitude != null && l.longitude != null ? textoUbicacion({ lat: Number(l.latitude), lng: Number(l.longitude) }) : "",
      horarioDias: leerHorario(l.opening_hours) ? JSON.stringify(leerHorario(l.opening_hours)) : "",
      precio: l.price_level ? String(l.price_level) : "",
      whatsapp: l.whatsapp ? l.whatsapp.replace(/^593/, "0") : "",
      web: l.website ?? "",
      facebook: l.facebook ?? "",
      instagram: l.instagram ?? "",
      tiktok: l.tiktok ?? "",
      youtube: l.youtube ?? "",
      estado: l.status,
    };
    if (l.status === "publicado") enlace = `/guayaquil/${categoria}/${l.slug}`;
    plan = { vigente: destacadoVigente(l.is_featured, l.featured_until), destacadoHasta: l.featured_until, verificado: l.is_verified };
    // getLugarAdmin ya exigió admin (requireAdmin) antes de leer el video con admin.ts
    [fotos, resenas, video] = await Promise.all([getFotosAdmin(l.id, configSupabase()!.url), getResenasDeLugar(l.id), getVideoPrivado(l.id)]);
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
      {id !== "nuevo" && <FotosLugar lugar={id} fotos={fotos} />}
      {id !== "nuevo" && <VideoNegocio lugar={id} video={video} modo="admin" />}
      {id !== "nuevo" && <PlanLugar lugar={id} {...plan} />}
      {id !== "nuevo" && (
        <section aria-labelledby="t-resenas" className="grid gap-4">
          <h2 id="t-resenas" className="m-0 text-xl leading-[26px] font-semibold">
            Reseñas ({resenas.length})
          </h2>
          {resenas.length === 0 ? <p className="m-0 text-rio-suave">Todavía no tiene reseñas.</p> : resenas.map((r) => <ResenaAdmin key={r.id} resena={r} modo="lugar" />)}
        </section>
      )}
    </div>
  );
}
