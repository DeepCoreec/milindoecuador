-- =====================================================================
-- 0024 · Recorridos de los guías (versión 13, fase 42; plan en docs/PLAN-V13.md)
--   - guide_tours: los recorridos que publica un guía (su ficha de la categoría "guias"): nombre, descripción, duración,
--     precio por persona (vacío = "a convenir") y punto de encuentro. Hasta 10 por guía.
--   - guide_tour_stops: las paradas, elegidas de los lugares de la Guía útil (city_spots), en orden. De 2 a 8 por recorrido.
-- El público lee los recorridos publicados de guías publicados. Solo escribe el servidor (clave de servicio), después de
-- comprobar que la ficha es de la cuenta. Los textos pasan por el filtro de palabras (0006), sin teléfonos ni enlaces:
-- el contacto es el WhatsApp de la ficha.
-- =====================================================================

create table public.guide_tours (
  id               uuid primary key default gen_random_uuid(),
  place_id         uuid not null references public.places (id) on delete cascade,
  name             text not null check (char_length(name) between 3 and 80),
  description      text not null check (char_length(description) between 40 and 800),
  duration_minutes smallint not null check (duration_minutes between 30 and 720),
  price_usd        numeric(6, 2) check (price_usd >= 0 and price_usd <= 1000),
  meeting_point    text not null check (char_length(meeting_point) between 3 and 160),
  status           text not null default 'borrador' check (status in ('borrador', 'publicado')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index guide_tours_place_idx on public.guide_tours (place_id, status);
create trigger set_updated_at before update on public.guide_tours for each row execute function public.set_updated_at();

create table public.guide_tour_stops (
  tour_id  uuid not null references public.guide_tours (id) on delete cascade,
  spot_id  uuid not null references public.city_spots (id) on delete cascade,
  position smallint not null check (position between 1 and 8),
  primary key (tour_id, position),
  unique (tour_id, spot_id)
);
create index guide_tour_stops_spot_idx on public.guide_tour_stops (spot_id);

-- ---------- Lectura pública ----------
alter table public.guide_tours enable row level security;
alter table public.guide_tour_stops enable row level security;

create policy "lectura de publicados" on public.guide_tours for select
  using (
    status = 'publicado'
    and exists (
      select 1 from public.places p join public.categories c on c.id = p.category_id
      where p.id = place_id and p.status = 'publicado' and c.slug = 'guias'
    )
  );
-- Una parada se ve si su recorrido se ve (la regla de guide_tours se aplica dentro) y su lugar está publicado
create policy "lectura de publicados" on public.guide_tour_stops for select
  using (
    exists (select 1 from public.guide_tours t where t.id = tour_id)
    and exists (select 1 from public.city_spots s where s.id = spot_id and s.status = 'publicado')
  );

revoke all on public.guide_tours, public.guide_tour_stops from anon, authenticated;
grant select on public.guide_tours, public.guide_tour_stops to anon, authenticated;

-- ---------- Topes y filtro de palabras ----------
create function public.revisar_recorrido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Un candado por guía: dos recorridos al mismo tiempo no se saltan el tope
    perform pg_advisory_xact_lock(hashtext('recorridos:' || new.place_id::text));
    if (select count(*) from public.guide_tours t where t.place_id = new.place_id) >= 10 then
      raise exception 'tope_recorridos' using hint = 'Cada guía tiene como mucho 10 recorridos';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.place_id is distinct from old.place_id then
    raise exception 'recorrido_de_otro' using hint = 'Un recorrido no cambia de guía';
  end if;
  if tg_op = 'INSERT' or new.name is distinct from old.name then perform public.revisar_campo('titulo', new.name, true); end if;
  if tg_op = 'INSERT' or new.description is distinct from old.description then perform public.revisar_campo('descripcion', new.description, true); end if;
  if tg_op = 'INSERT' or new.meeting_point is distinct from old.meeting_point then perform public.revisar_campo('encuentro', new.meeting_point, true); end if;
  return new;
end;
$$;
revoke execute on function public.revisar_recorrido() from public, anon, authenticated;
create trigger revisar_recorrido before insert or update on public.guide_tours
  for each row execute function public.revisar_recorrido();

-- Las paradas solo pueden ser lugares de la guía publicados del grupo "visitar"
create function public.revisar_parada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.city_spots s where s.id = new.spot_id and s.status = 'publicado' and s.grupo = 'visitar') then
    raise exception 'parada_no_valida' using hint = 'Elige un lugar para visitar de la guía';
  end if;
  return new;
end;
$$;
revoke execute on function public.revisar_parada() from public, anon, authenticated;
create trigger revisar_parada before insert or update on public.guide_tour_stops
  for each row execute function public.revisar_parada();
