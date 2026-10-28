-- =====================================================================
-- 0019 · Agente revisor de la Guía útil (versión 6, fase 27.1; plan en docs/PLAN-V6.md)
-- El agente RECOMIENDA (publicar / revisar / descartar, con su motivo) y el admin DECIDE.
--   1. La recomendación vive en city_spots (agent_*). Solo la escribe el servidor (clave de servicio, después de
--      requireAdmin); el público no la ve.
--   2. spot_decisions: registro de cada decisión del admin, con lo que había recomendado el agente en ese momento.
--      Sirve para medir cuánto acierta el agente ("coincidió contigo en N de M") antes de darle más autonomía.
--      La llena un disparador: no depende de que el código se acuerde de anotar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Recomendación del agente
-- ---------------------------------------------------------------------
alter table public.city_spots
  add column agent_verdict text check (agent_verdict in ('publicar', 'revisar', 'descartar')),
  add column agent_reason  text check (char_length(agent_reason) <= 200),
  add column agent_source  text check (agent_source in ('regla', 'ia')),
  add column agent_model   text check (char_length(agent_model) <= 60),
  add column agent_at      timestamptz,
  add constraint agente_completo check ((agent_verdict is null) = (agent_reason is null));

-- Desde el navegador se lee la guía por columnas: todo menos la recomendación del agente (0017 daba la tabla entera).
-- Vale para anon y para las cuentas con sesión (incluido el admin): el panel lee la recomendación con admin.ts,
-- después de requireAdmin (revisión independiente del 2026-10-28).
revoke select on public.city_spots from anon, authenticated;
grant select (id, city_id, osm_type, osm_id, grupo, tipo, name, note, latitude, longitude, address, phone, website,
  opening_hours, status, imported_at, created_at, updated_at) on public.city_spots to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Registro de decisiones del admin
-- ---------------------------------------------------------------------
create table public.spot_decisions (
  id             bigint generated always as identity primary key,
  spot_id        uuid not null references public.city_spots (id) on delete cascade,
  tipo           text not null,
  decision       text not null check (decision in ('publicar', 'revisar', 'descartar')),
  agent_verdict  text check (agent_verdict in ('publicar', 'revisar', 'descartar')),
  admin_id       uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index spot_decisions_tipo_idx on public.spot_decisions (tipo, created_at desc);
alter table public.spot_decisions enable row level security;
create policy "admin lee" on public.spot_decisions for select to authenticated using ((select public.is_admin()));
revoke all on public.spot_decisions from anon, authenticated;
grant select on public.spot_decisions to authenticated; -- solo pasa la política del admin

-- Solo cuentan como decisión publicar y descartar. "Devolver a revisión" no se anota (no es un acierto ni un error
-- del agente) y borra la recomendación vieja para que el agente vuelva a mirar ese lugar.
create function public.anotar_decision_sitio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status in ('publicado', 'descartado') then
    insert into public.spot_decisions (spot_id, tipo, decision, agent_verdict, admin_id)
    values (
      new.id,
      new.tipo,
      case new.status when 'publicado' then 'publicar' else 'descartar' end,
      new.agent_verdict,
      (select auth.uid())
    );
  end if;
  return null;
end;
$$;

create function public.limpiar_recomendacion_sitio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pendiente' and old.status is distinct from 'pendiente' then
    new.agent_verdict := null;
    new.agent_reason := null;
    new.agent_source := null;
    new.agent_model := null;
    new.agent_at := null;
  end if;
  return new;
end;
$$;
create trigger limpiar_recomendacion before update of status on public.city_spots
  for each row execute function public.limpiar_recomendacion_sitio();
create trigger anotar_decision after update of status on public.city_spots
  for each row execute function public.anotar_decision_sitio();
