-- =====================================================================
-- 0007 · Extras (versión 2, fase 10)
--   1. Horario por día, para mostrar "Abierto ahora / Cerrado".
--   2. Estadísticas para el dueño: vistas de la ficha y toques a WhatsApp y "Cómo llegar", por día.
--   3. Favoritos: cada persona guarda lugares para ir después.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Horario por día. Ejemplo: {"lun": ["08:00", "22:00"], "dom": ["10:00", "02:00"]}
--    Un día que no aparece = cerrado. Si la hora de cierre es menor que la de apertura, cierra después
--    de medianoche. La forma exacta la valida el servidor (Zod); aquí, lo básico.
-- ---------------------------------------------------------------------
alter table public.places add column opening_hours jsonb
  check (
    opening_hours is null
    or (jsonb_typeof(opening_hours) = 'object' and octet_length(opening_hours::text) <= 600)
  );
grant select (opening_hours) on public.places to anon, authenticated;
grant insert (opening_hours), update (opening_hours) on public.places to authenticated;

-- ---------------------------------------------------------------------
-- 2. Estadísticas por día. Solo las escribe el servidor (con la función de abajo) y solo las lee el servidor
--    (para el dueño, después de comprobar que es suyo) o el admin.
-- ---------------------------------------------------------------------
create table public.place_stats (
  place_id   uuid not null references public.places (id) on delete cascade,
  day        date not null default ((now() at time zone 'America/Guayaquil')::date),
  views      integer not null default 0 check (views >= 0),
  whatsapp   integer not null default 0 check (whatsapp >= 0),
  route      integer not null default 0 check (route >= 0),
  primary key (place_id, day)
);
alter table public.place_stats enable row level security;
create policy "admin lee" on public.place_stats for select to authenticated using ((select public.is_admin()));
revoke all on public.place_stats from anon, authenticated;
grant select on public.place_stats to authenticated;

-- Suma 1 al contador del día. Solo para lugares publicados. Solo la llama el servidor (service_role).
create function public.contar_evento(lugar uuid, tipo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tipo not in ('views', 'whatsapp', 'route') then
    raise exception 'tipo de evento inválido';
  end if;
  if not exists (select 1 from public.places where id = lugar and status = 'publicado') then
    return;
  end if;
  insert into public.place_stats (place_id, views, whatsapp, route)
  values (lugar, (tipo = 'views')::int, (tipo = 'whatsapp')::int, (tipo = 'route')::int)
  on conflict (place_id, day) do update set
    views = public.place_stats.views + excluded.views,
    whatsapp = public.place_stats.whatsapp + excluded.whatsapp,
    route = public.place_stats.route + excluded.route;
end;
$$;
revoke execute on function public.contar_evento(uuid, text) from public, anon, authenticated;
grant execute on function public.contar_evento(uuid, text) to service_role;

-- ---------------------------------------------------------------------
-- 3. Favoritos: cada persona ve, agrega y quita solo los suyos. Máximo 500 por persona.
-- ---------------------------------------------------------------------
create table public.favorites (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  place_id    uuid not null references public.places (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, place_id)
);
create index favorites_lugar_idx on public.favorites (place_id);
alter table public.favorites enable row level security;
create policy "ve los suyos" on public.favorites for select to authenticated using (user_id = (select auth.uid()));
create policy "agrega los suyos" on public.favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.places p where p.id = place_id and p.status = 'publicado')
  );
create policy "quita los suyos" on public.favorites for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.favorites from anon, authenticated;
grant select, delete on public.favorites to authenticated;
grant insert (place_id) on public.favorites to authenticated;

create function public.limite_favoritos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.favorites where user_id = new.user_id) >= 500 then
    raise exception 'limite_favoritos';
  end if;
  return new;
end;
$$;
create trigger limite_favoritos before insert on public.favorites
  for each row execute function public.limite_favoritos();
