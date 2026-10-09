-- =====================================================================
-- 0009 · Video y redes del negocio (versión 3, fase 11)
--   1. Enlaces del negocio: YouTube, TikTok, Facebook, Instagram y página web.
--      La base comprueba que cada enlace sea https y de SU red (el de Facebook va a facebook.com).
--   2. Un video por negocio (tabla place_videos + bucket videos-lugares). Sale al instante, sin aprobación.
--      Lo escribe solo el servidor (dueño o admin, después de comprobar quién es), como las fotos del dueño.
--   3. Reportar el video: con 3 reportes de cuentas con 7 días o más se oculta SOLO el video.
--   4. Estadísticas: reproducciones del video.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Enlaces del negocio
-- ---------------------------------------------------------------------
create function public.enlace_valido(enlace text, dominios text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select enlace is null or (
    char_length(enlace) <= 300
    and enlace ~ '^https://[^/@:\s]+(/[^\s]*)?$'
    and (
      dominios is null
      or exists (
        select 1 from unnest(dominios) d
        where lower(split_part(substring(enlace from 9), '/', 1)) = d
           or lower(split_part(substring(enlace from 9), '/', 1)) like '%.' || d
      )
    )
  );
$$;

alter table public.places
  add column website   text check (public.enlace_valido(website, null)),
  add column facebook  text check (public.enlace_valido(facebook, array['facebook.com', 'fb.com', 'fb.me'])),
  add column instagram text check (public.enlace_valido(instagram, array['instagram.com'])),
  add column tiktok    text check (public.enlace_valido(tiktok, array['tiktok.com'])),
  add column youtube   text check (public.enlace_valido(youtube, array['youtube.com', 'youtu.be']));

grant select (website, facebook, instagram, tiktok, youtube) on public.places to anon, authenticated;
grant insert (website, facebook, instagram, tiktok, youtube), update (website, facebook, instagram, tiktok, youtube)
  on public.places to authenticated;

-- Los enlaces también pasan por el filtro de palabras (un dominio con insultos no entra).
-- Se reescribe la función de 0006 con todo lo anterior + los enlaces (sigue con los permisos de su dueño, 0008).
create or replace function public.revisar_textos_lugar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.name is distinct from old.name then perform public.revisar_campo('nombre', new.name, false); end if;
  if tg_op = 'INSERT' or new.sector is distinct from old.sector then perform public.revisar_campo('sector', new.sector, false); end if;
  if tg_op = 'INSERT' or new.description is distinct from old.description then perform public.revisar_campo('descripcion', new.description, true); end if;
  if tg_op = 'INSERT' or new.short_fact is distinct from old.short_fact then perform public.revisar_campo('dato', new.short_fact, true); end if;
  if tg_op = 'INSERT' or new.hours is distinct from old.hours then perform public.revisar_campo('horario', new.hours, false); end if;
  if tg_op = 'INSERT' or new.address is distinct from old.address then perform public.revisar_campo('direccion', new.address, false); end if;
  if tg_op = 'INSERT' or new.website is distinct from old.website then perform public.revisar_campo('web', new.website, false); end if;
  if tg_op = 'INSERT' or new.facebook is distinct from old.facebook then perform public.revisar_campo('facebook', new.facebook, false); end if;
  if tg_op = 'INSERT' or new.instagram is distinct from old.instagram then perform public.revisar_campo('instagram', new.instagram, false); end if;
  if tg_op = 'INSERT' or new.tiktok is distinct from old.tiktok then perform public.revisar_campo('tiktok', new.tiktok, false); end if;
  if tg_op = 'INSERT' or new.youtube is distinct from old.youtube then perform public.revisar_campo('youtube', new.youtube, false); end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Un video por negocio
-- ---------------------------------------------------------------------
create table public.place_videos (
  place_id          uuid primary key references public.places (id) on delete cascade,
  storage_path      text not null unique check (storage_path ~ '^lugares/[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|mov|webm)$'),
  poster_path       text check (poster_path ~ '^lugares/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'),
  duration_seconds  numeric(5, 1) not null check (duration_seconds > 0 and duration_seconds <= 90),
  size_bytes        integer not null check (size_bytes > 0 and size_bytes <= 52428800),
  hidden            boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- el archivo tiene que estar en la carpeta de SU lugar
  check (split_part(storage_path, '/', 2) = place_id::text),
  check (poster_path is null or split_part(poster_path, '/', 2) = place_id::text)
);
create trigger set_updated_at before update on public.place_videos for each row execute function public.set_updated_at();
alter table public.place_videos enable row level security;

-- En público: solo videos no ocultos de lugares publicados. El admin ve todos.
create policy "ve los publicados" on public.place_videos for select to anon, authenticated
  using (not hidden and exists (select 1 from public.places p where p.id = place_id and p.status = 'publicado'));
create policy "admin gestiona" on public.place_videos for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.place_videos from anon, authenticated;
grant select (place_id, storage_path, poster_path, duration_seconds, hidden, created_at, updated_at)
  on public.place_videos to anon, authenticated;
-- Escribir: solo el servidor (service_role) después de comprobar dueño o admin. Ningún permiso para el navegador.

-- Bucket: lectura pública (el reproductor usa la URL pública), 50 MB por archivo (máximo del plan gratis),
-- solo videos y la portada (WebP; JPG en Safari, que no sabe guardar WebP). Sin políticas de escritura: se sube con permiso firmado que da el servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos-lugares', 'videos-lugares', true, 52428800, array['video/mp4', 'video/quicktime', 'video/webm', 'image/webp', 'image/jpeg']);

-- Registro de cambios: tipos nuevos para los videos
alter table public.place_changes drop constraint place_changes_kind_check;
alter table public.place_changes add constraint place_changes_kind_check
  check (kind in ('ficha', 'estado', 'foto-permiso', 'foto-nueva', 'foto-borrada', 'foto-orden', 'respuesta', 'oculta-por-reportes',
                  'video-permiso', 'video-nuevo', 'video-borrado', 'video-oculto-por-reportes'));

-- ---------------------------------------------------------------------
-- 3. Reportar el video
-- ---------------------------------------------------------------------
alter table public.place_reports
  add column target text not null default 'lugar' check (target in ('lugar', 'video'));
alter table public.place_reports drop constraint place_reports_place_id_reporter_id_key;
alter table public.place_reports add constraint place_reports_una_vez unique (place_id, reporter_id, target);
grant insert (target) on public.place_reports to authenticated;

drop policy "reporta" on public.place_reports;
create policy "reporta" on public.place_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (select 1 from public.places p where p.id = place_reports.place_id and p.status = 'publicado')
    -- un video solo se reporta si se ve (la regla de place_videos ya esconde los ocultos)
    and (target = 'lugar' or exists (select 1 from public.place_videos v where v.place_id = place_reports.place_id))
  );

create or replace function public.ocultar_por_reportes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Solo cuentan reportes sin resolver de cuentas con 7 días o más (evita cuentas nuevas contra la competencia)
  if (
    select count(*) from public.place_reports r
    join public.profiles p on p.id = r.reporter_id
    where r.place_id = new.place_id and r.target = new.target and not r.resolved and p.created_at < now() - interval '7 days'
  ) < 3 then
    return null;
  end if;

  if new.target = 'video' then
    -- Solo el video (aunque la ficha esté verificada: lo que se reporta es el contenido)
    update public.place_videos set hidden = true where place_id = new.place_id and not hidden;
    if found then
      insert into public.place_changes (place_id, kind, detail)
      values (new.place_id, 'video-oculto-por-reportes', 'El video se ocultó solo al llegar a 3 reportes');
    end if;
  elsif exists (select 1 from public.places where id = new.place_id and status = 'publicado' and not is_verified) then
    update public.places set status = 'oculto' where id = new.place_id;
    insert into public.place_changes (place_id, kind, detail)
    values (new.place_id, 'oculta-por-reportes', 'Se ocultó sola al llegar a 3 reportes');
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Estadísticas: reproducciones del video
-- ---------------------------------------------------------------------
alter table public.place_stats add column video integer not null default 0 check (video >= 0);

create or replace function public.contar_evento(lugar uuid, tipo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tipo not in ('views', 'whatsapp', 'route', 'video') then
    raise exception 'tipo de evento inválido';
  end if;
  if not exists (select 1 from public.places where id = lugar and status = 'publicado') then
    return;
  end if;
  insert into public.place_stats (place_id, views, whatsapp, route, video)
  values (lugar, (tipo = 'views')::int, (tipo = 'whatsapp')::int, (tipo = 'route')::int, (tipo = 'video')::int)
  on conflict (place_id, day) do update set
    views = public.place_stats.views + excluded.views,
    whatsapp = public.place_stats.whatsapp + excluded.whatsapp,
    route = public.place_stats.route + excluded.route,
    video = public.place_stats.video + excluded.video;
end;
$$;
revoke execute on function public.contar_evento(uuid, text) from public, anon, authenticated;
grant execute on function public.contar_evento(uuid, text) to service_role;
