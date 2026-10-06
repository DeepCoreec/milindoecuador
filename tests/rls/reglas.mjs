// Pruebas de las reglas de seguridad (RLS) en un Postgres en memoria (PGlite).
// Ejecutar: npm run test:rls (también corre dentro de npm test).
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";

const db = new PGlite();

// --- Imitación mínima de lo que Supabase ya trae ---
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
  grant all on all tables in schema public to service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`);

// Todas las migraciones, en orden
const carpeta = new URL("../../supabase/migrations/", import.meta.url);
for (const archivo of readdirSync(carpeta).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(new URL(archivo, carpeta), "utf8"));
}
await db.exec(`grant all on all tables in schema public to service_role;`);

// --- Datos de prueba (como superusuario) ---
const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const ADM = "00000000-0000-0000-0000-0000000000ad";
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${A}', 'ana@test.com', '{"full_name":"Ana"}'),
    ('${B}', 'beto@test.com', '{}'),
    ('${ADM}', 'admin@test.com', '{}'),
    ('00000000-0000-0000-0000-0000000000c1', 'juan@test.com', '{"full_name":"Juan  Pérez García"}');
  update public.profiles set role = 'admin' where id = '${ADM}';
`);
const gye = (await db.query(`select id from public.cities where slug='guayaquil'`)).rows[0].id;
const cat = (await db.query(`select id from public.categories where slug='turismo'`)).rows[0].id;
for (let i = 1; i <= 7; i++) {
  await db.query(
    `insert into public.places (city_id, category_id, slug, name, sector, description, status)
     values ($1, $2, $3, $4, 'Centro', 'Descripción de prueba suficientemente larga', $5)`,
    [gye, cat, `lugar-${i}`, `Lugar ${i}`, i === 7 ? "borrador" : "publicado"]
  );
}
const ids = (await db.query(`select id, slug from public.places order by slug`)).rows;
const P = Object.fromEntries(ids.map((r) => [r.slug, r.id]));

// --- Ayudantes ---
let ok = 0, fail = 0;
async function as(role, sub, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub}', false); set role ${role};`);
  try { return { rows: (await db.query(sql, params)).rows }; }
  catch (e) { return { error: e.message }; }
  finally { await db.exec(`reset role;`); }
}
function check(name, cond, detail) {
  if (cond) { ok++; console.log("  OK   ", name); }
  else { fail++; console.log("  FALLA", name, JSON.stringify(detail)); }
}

console.log("\nPerfiles");
const prof = (await db.query(`select id, display_name, role from public.profiles order by display_name`)).rows;
check("perfil creado al registrarse (4)", prof.length === 4, prof);
check("nombre tomado de full_name", prof.some((p) => p.display_name === "Ana"), prof);
check("con nombre de Google queda nombre e inicial", prof.some((p) => p.display_name === "Juan P."), prof);
check("el nombre nunca sale del correo", !prof.some((p) => p.display_name === "beto") && prof.some((p) => p.display_name === "Visitante"), prof);

console.log("\nVisitante sin sesión (anon)");
let r = await as("anon", "", `select slug from public.places`);
check("solo ve lugares publicados (6 de 7)", r.rows?.length === 6, r);
r = await as("anon", "", `insert into public.reviews (place_id, stars, text) values ($1, 5, 'Muy bueno el lugar')`, [P["lugar-1"]]);
check("no puede escribir reseñas", !!r.error, r);
r = await as("anon", "", `insert into public.business_requests (business_name, category_id, city_id, contact_name, whatsapp) values ('X', $1, $2, 'Yo', '593991234567')`, [cat, gye]);
check("no puede insertar solicitudes directo", !!r.error, r);
r = await as("anon", "", `select * from public.business_requests`);
check("no puede leer solicitudes", !!r.error || r.rows.length === 0, r);

console.log("\nUsuario Ana");
// Desde 0003 las reseñas se crean y editan solo desde el servidor (después del captcha), con la clave de servicio
r = await as("authenticated", A, `insert into public.reviews (place_id, stars, text) values ($1, 5, 'Salto el captcha directo')`, [P["lugar-1"]]);
check("no puede crear reseñas directo en la base (sin captcha)", !!r.error, r);
const resena = (lugar, estrellas, texto, autor = A) =>
  as("service_role", "", `insert into public.reviews (place_id, user_id, stars, text) values ($1, $2, $3, $4) returning user_id`, [P[lugar], autor, estrellas, texto]);
r = await resena("lugar-1", 5, "Excelente sitio, volvería");
check("el servidor crea su reseña con el autor fijado", r.rows?.[0]?.user_id === A, r);
r = await resena("lugar-1", 4, "Otra reseña igual de larga");
check("no puede dejar 2 reseñas en el mismo lugar", !!r.error, r);
r = await resena("lugar-7", 4, "Reseña en un borrador");
check("no se puede reseñar un lugar no publicado (lo frena la base)", !!r.error && r.error.includes("publicados"), r);
r = await resena("lugar-2", 9, "Estrellas inválidas aquí");
check("estrellas fuera de 1 a 5 rechazadas", !!r.error, r);
r = await resena("lugar-2", 4, "Texto con \u202Eletras invertidas");
check("texto con caracteres invisibles rechazado", !!r.error, r);
r = await as("authenticated", A, `update public.profiles set role = 'admin' where id = $1`, [A]);
check("no puede hacerse admin", !!r.error, r);
r = await as("authenticated", A, `update public.profiles set display_name = 'Ana María' where id = $1 returning display_name`, [A]);
check("puede cambiar su nombre visible", r.rows?.[0]?.display_name === "Ana María", r);
r = await as("authenticated", A, `update public.profiles set display_name = $2 where id = $1`, [A, "Admin\u200B oficial"]);
check("nombre con caracteres invisibles rechazado", !!r.error, r);
r = await as("authenticated", A, `update public.profiles set display_name = 'Hackeado' where id = $1 returning id`, [B]);
check("no puede cambiar el nombre de otro", r.rows?.length === 0, r);
r = await as("authenticated", A, `update public.reviews set status = 'oculta' where user_id = $1 returning id`, [A]);
check("no puede cambiar el estado de su reseña", !!r.error || r.rows?.length === 0, r);
r = await as("authenticated", A, `update public.reviews set stars = 1 where user_id = $1 returning stars`, [A]);
check("no puede editar su reseña directo en la base (sin captcha)", !!r.error, r);
r = await as("authenticated", A, `insert into public.places (city_id, category_id, slug, name, sector, description) values ($1, $2, 'mio', 'Mío', 'Centro', 'Descripción de prueba suficientemente larga')`, [gye, cat]);
check("no puede crear lugares", !!r.error, r);
r = await as("authenticated", A, `insert into storage.objects (bucket_id, name) values ('fotos-lugares', 'x.jpg')`);
check("no puede subir fotos", !!r.error, r);
for (const s of ["lugar-2", "lugar-3", "lugar-4", "lugar-5"]) await resena(s, 4, "Reseña de prueba número");
r = await resena("lugar-6", 4, "La sexta reseña del día");
check("límite de 5 reseñas por día", !!r.error && r.error.includes("límite"), r);
await as("authenticated", A, `delete from public.reviews where user_id = $1 and place_id = $2`, [A, P["lugar-5"]]);
r = await resena("lugar-6", 4, "Borro una y vuelvo a intentar");
check("el límite no se salta borrando y volviendo a crear", !!r.error && r.error.includes("límite"), r);

console.log("\nPerfiles en público");
r = await as("anon", "", `select display_name from public.profiles`);
check("se ve el nombre visible", !r.error && r.rows.length > 0, r);
r = await as("anon", "", `select role from public.profiles`);
check("no se puede leer el rol de nadie", !!r.error, r);
r = await as("anon", "", `select created_at from public.profiles`);
check("no se puede leer la fecha de alta", !!r.error, r);
r = await as("authenticated", A, `select public.is_admin() as admin`);
check("is_admin() es falso para un usuario", r.rows?.[0]?.admin === false, r);
r = await as("authenticated", ADM, `select public.is_admin() as admin`);
check("is_admin() es verdadero para el admin", r.rows?.[0]?.admin === true, r);

console.log("\nUsuario Beto");
r = await as("authenticated", B, `update public.reviews set text = 'Cambio la reseña de Ana' where user_id = $1 returning id`, [A]);
check("no puede editar reseñas de otros", !!r.error || r.rows?.length === 0, r);
r = await as("authenticated", B, `delete from public.reviews where user_id = $1 returning id`, [A]);
check("no puede borrar reseñas de otros", r.rows?.length === 0, r);
const revA = (await db.query(`select id from public.reviews where user_id=$1 and place_id=$2`, [A, P["lugar-1"]])).rows[0].id;
r = await as("authenticated", B, `insert into public.review_reports (review_id, reason) values ($1, 'Es falsa')`, [revA]);
check("puede reportar una reseña", !r.error, r);
r = await as("authenticated", B, `select * from public.review_reports`);
check("no puede leer los reportes", r.rows?.length === 0, r);

console.log("\nAdmin");
r = await as("authenticated", ADM, `update public.reviews set status = 'oculta', owner_reply = 'Gracias' where id = $1 returning status`, [revA]);
check("puede ocultar una reseña y responder", r.rows?.[0]?.status === "oculta", r);
r = await as("authenticated", ADM, `select count(*)::int as n from public.review_reports`);
check("puede leer los reportes", r.rows?.[0]?.n === 1, r);
r = await as("authenticated", ADM, `select slug from public.places`);
check("ve también los borradores (7)", r.rows?.length === 7, r);
r = await as("authenticated", ADM, `insert into storage.objects (bucket_id, name) values ('fotos-lugares', 'x.jpg') returning id`);
check("puede subir fotos", !r.error, r);
r = await as("authenticated", ADM, `insert into storage.objects (bucket_id, name) values ('otro-bucket', 'x.jpg')`);
check("no puede subir a otro bucket", !!r.error, r);

console.log("\nReseña oculta y calificaciones");
r = await as("anon", "", `select id from public.reviews where id = $1`, [revA]);
check("visitante no ve la reseña oculta", r.rows?.length === 0, r);
r = await as("authenticated", A, `select id from public.reviews where id = $1`, [revA]);
check("la autora sí ve su reseña oculta", r.rows?.length === 1, r);
r = await as("anon", "", `select * from public.place_ratings where place_id = $1`, [P["lugar-1"]]);
check("el promedio no cuenta reseñas ocultas", r.rows?.length === 0, r);
r = await as("anon", "", `select review_count from public.place_ratings where place_id = $1`, [P["lugar-2"]]);
check("el promedio cuenta reseñas visibles", r.rows?.[0]?.review_count === 1, r);

console.log("\nServidor (service_role)");
r = await as("service_role", "", `insert into public.business_requests (business_name, category_id, city_id, contact_name, whatsapp) values ('Encebollados El Puerto', $1, $2, 'Juan', '593991234567') returning status`, [cat, gye]);
check("el servidor inserta solicitudes", r.rows?.[0]?.status === "pendiente", r);
r = await as("service_role", "", `insert into public.business_requests (business_name, category_id, city_id, contact_name, whatsapp) values ('X Y', $1, $2, 'Juan', '0991234567')`, [cat, gye]);
check("WhatsApp con formato inválido rechazado", !!r.error, r);

console.log("\nDatos iniciales (supabase/seed.sql)");
const seed = readFileSync(new URL("../../supabase/seed.sql", import.meta.url), "utf8");
await db.exec(seed);
await db.exec(seed); // dos veces: no debe duplicar ni fallar
r = await db.query(`select count(*)::int as n from public.places where slug in ('malecon-2000','cerro-santa-ana','parque-seminario','isla-santay') and status = 'borrador'`);
check("seed carga los 4 lugares reales como borrador, sin duplicar", r.rows[0].n === 4, r.rows);
r = await as("anon", "", `select id from public.places where slug = 'malecon-2000'`);
check("un borrador no se ve en público", r.rows?.length === 0, r);

console.log("\nRLS activado en todas las tablas");
r = await db.query(`select tablename from pg_tables where schemaname='public' and not rowsecurity`);
check("ninguna tabla sin RLS", r.rows.length === 0, r.rows);

console.log(`\nResultado: ${ok} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
