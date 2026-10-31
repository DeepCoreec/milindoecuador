import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FotosSitio } from "@/components/admin/FotosSitio";
import { requireAdmin } from "@/lib/auth";
import { rutaSitio } from "@/lib/datos/sitios";
import { urlPublicaFoto } from "@/lib/fotos";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { exigirConfigSupabase } from "@/lib/supabase/config";

/** Fotos de un lugar de la Guía útil en el panel (versión 12, 40.3): la principal y las más (de Commons o propias). */
export default async function PaginaFotosSitio({ params }: PageProps<"/admin/guia/fotos/[sitio]">) {
  await requireAdmin();
  const { sitio } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sitio)) notFound();
  const db = crearClienteAdmin();
  const [{ data: s }, { data: fotos }] = await Promise.all([
    db.from("city_spots").select("id, name, status, grupo, photo_path, photo_credit, photo_license").eq("id", sitio).maybeSingle(),
    db.from("city_spot_photos").select("id, storage_path, alt_text, credit, license, source").eq("spot_id", sitio).order("sort_order").order("created_at"),
  ]);
  if (!s || s.grupo !== "visitar") notFound();
  const base = exigirConfigSupabase().url;
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <Link href="/admin/guia?estado=publicado" className="text-sm">
          ← Volver a la Guía útil
        </Link>
        <h1 className="m-0 text-2xl font-semibold">Fotos de {s.name}</h1>
        {s.status === "publicado" && (
          <Link href={rutaSitio({ id: s.id, nombre: s.name })} className="text-sm">
            Ver la página del lugar
          </Link>
        )}
      </div>
      <section aria-labelledby="t-principal" className="grid gap-2">
        <h2 id="t-principal" className="m-0 text-lg font-semibold">
          Foto principal
        </h2>
        {s.photo_path ? (
          <div className="grid gap-1">
            <Image src={urlPublicaFoto(base, s.photo_path)} alt={`Foto de ${s.name}`} width={320} height={240} sizes="320px" className="aspect-[4/3] w-80 rounded-lg object-cover" />
            <span className="text-[13px] text-rio-suave">
              {s.photo_credit} · {s.photo_license}
            </span>
          </div>
        ) : (
          <p className="m-0 text-sm text-rio-suave">Sin foto principal. La primera foto propia que subas se usará como principal en la galería.</p>
        )}
      </section>
      <FotosSitio
        sitio={s.id}
        fotos={(fotos ?? []).map((f) => ({ id: f.id, src: urlPublicaFoto(base, f.storage_path), alt: f.alt_text, credito: f.credit, licencia: f.license, fuente: f.source }))}
      />
    </div>
  );
}
