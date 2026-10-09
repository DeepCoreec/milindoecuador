// Pruebas de las reglas de seguridad (RLS) en un Postgres en memoria (PGlite).
// Ejecutar: npm run test:rls (también corre dentro de npm test).
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readdirSync, readFileSync } from "node:fs";

const db = new PGlite({ extensions: { pg_trgm } }); // pg_trgm: el buscador (0010), como en Supabase

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

console.log("\nUbicación (0004)");
r = await as("authenticated", ADM, `update public.places set latitude = -2.190, longitude = -79.880 where id = $1 returning latitude`, [P["lugar-1"]]);
check("el admin guarda la ubicación", Number(r.rows?.[0]?.latitude) === -2.19, r);
r = await as("authenticated", ADM, `update public.places set latitude = 2.190, longitude = 79.880 where id = $1`, [P["lugar-1"]]);
check("rechaza una ubicación fuera de Ecuador (signo cambiado)", !!r.error, r);
r = await as("authenticated", ADM, `update public.places set latitude = -2.2, longitude = null where id = $1`, [P["lugar-2"]]);
check("rechaza latitud sin longitud", !!r.error, r);
r = await as("authenticated", ADM, `update public.places set latitude = -0.74, longitude = -90.31 where id = $1 returning id`, [P["lugar-3"]]);
check("acepta Galápagos", r.rows?.length === 1, r);
r = await as("authenticated", A, `update public.places set latitude = -2.1, longitude = -79.9 where id = $1 returning id`, [P["lugar-2"]]);
check("un usuario común no cambia la ubicación", !!r.error || r.rows.length === 0, r);
r = await as("anon", "", `select latitude, longitude from public.places where id = $1`, [P["lugar-1"]]);
check("el visitante lee la ubicación de un lugar publicado", Number(r.rows?.[0]?.longitude) === -79.88, r);

console.log("\nDueños (0005)");
await db.query(`update public.places set owner_id = $1 where id = $2`, [B, P["lugar-4"]]);
r = await as("anon", "", `select owner_id from public.places where id = $1`, [P["lugar-4"]]);
check("el visitante no puede leer quién es el dueño", !!r.error, r);
r = await as("authenticated", B, `select owner_id from public.places where id = $1`, [P["lugar-4"]]);
check("ni el propio dueño lo lee desde el navegador", !!r.error, r);
r = await as("anon", "", `select id, name, latitude from public.places where id = $1`, [P["lugar-4"]]);
check("las demás columnas se siguen leyendo", r.rows?.length === 1, r);
r = await as("authenticated", B, `update public.places set description = 'Cambiada por el dueño sin pasar por el servidor' where id = $1 returning id`, [P["lugar-4"]]);
check("el dueño no edita su ficha directo (solo el servidor)", !!r.error || r.rows.length === 0, r);
r = await as("authenticated", ADM, `update public.places set owner_id = $1 where id = $2`, [A, P["lugar-4"]]);
check("ni el admin cambia el dueño desde el navegador", !!r.error, r);
r = await as("authenticated", ADM, `update public.places set name = 'Lugar 4 editado' where id = $1 returning name`, [P["lugar-4"]]);
check("el admin sigue editando las fichas", r.rows?.[0]?.name === "Lugar 4 editado", r);
r = await as("authenticated", ADM, `insert into public.places (city_id, category_id, slug, name, sector, description) values ($1, $2, 'nuevo-admin', 'Nuevo', 'Centro', 'Descripción de prueba suficientemente larga') returning id`, [gye, cat]);
check("el admin sigue creando fichas", r.rows?.length === 1, r);
r = await as("authenticated", ADM, `insert into public.places (city_id, category_id, slug, name, sector, description, owner_id) values ($1, $2, 'nuevo-admin-2', 'Nuevo', 'Centro', 'Descripción de prueba suficientemente larga', $3)`, [gye, cat, A]);
check("al crear, el navegador no puede poner dueño", !!r.error, r);
r = await as("service_role", "", `update public.places set owner_id = $1 where id = $2 returning owner_id`, [A, P["lugar-4"]]);
check("el servidor sí asigna el dueño", r.rows?.[0]?.owner_id === A, r);

console.log("\nModeración automática (0006)");
r = await db.query(`select public.normalizar_texto('¡Qué M1ÉRDAAA de lugar!') as n`);
check("normaliza tildes, números-letra y repeticiones", r.rows[0].n === "que mierda de lugar", r.rows);
r = await as("authenticated", ADM, `update public.places set description = 'Un lugar de mierda, la verdad no vayan' where id = $1`, [P["lugar-5"]]);
check("rechaza una palabra prohibida en la ficha (aunque sea el admin)", /texto_no_permitido:descripcion:palabra/.test(r.error ?? ""), r);
r = await as("service_role", "", `update public.places set description = 'Pídenos por WhatsApp al 099 123 4567 y te llevamos' where id = $1`, [P["lugar-5"]]);
check("rechaza teléfonos en la descripción", /texto_no_permitido:descripcion:telefono/.test(r.error ?? ""), r);
r = await as("service_role", "", `update public.places set description = 'Más fotos en www.mi-negocio.com y en Instagram' where id = $1`, [P["lugar-5"]]);
check("rechaza enlaces en la descripción", /texto_no_permitido:descripcion:enlace/.test(r.error ?? ""), r);
r = await as("service_role", "", `update public.places set description = 'Abierto de 08:00 a 22:00, almuerzos a 3,50 desde 2015. Computadoras para clientes.', hours = 'Lunes a sábado de 08:00 a 22:00' where id = $1 returning id`, [P["lugar-5"]]);
check("deja pasar horarios, precios, años y palabras que contienen otras", r.rows?.length === 1, r);
await db.query(`update public.places set description = 'Texto viejo con mierda guardado antes de la moderación' where id = $1`, [P["lugar-6"]]).catch(() => {});
await db.exec(`alter table public.places disable trigger revisar_textos`);
await db.query(`update public.places set description = 'Texto viejo con mierda guardado antes de la moderación' where id = $1`, [P["lugar-6"]]);
await db.exec(`alter table public.places enable trigger revisar_textos`);
r = await as("authenticated", ADM, `update public.places set is_featured = true where id = $1 returning id`, [P["lugar-6"]]);
check("una ficha vieja no bloquea otros cambios (solo se revisa lo que cambia)", r.rows?.length === 1, r);
r = await as("service_role", "", `insert into public.reviews (place_id, user_id, stars, text) values ($1, $2, 1, 'Son unos cojudos, no vayan')`, [P["lugar-6"], B]);
check("rechaza insultos en reseñas", /texto_no_permitido:resena:palabra/.test(r.error ?? ""), r);
r = await as("authenticated", A, `update public.profiles set display_name = 'Pendejo' where id = $1`, [A]);
check("rechaza nombres visibles con insultos", /texto_no_permitido/.test(r.error ?? ""), r);
r = await as("authenticated", A, `select word from public.banned_words`);
check("un usuario común no ve la lista de palabras", !!r.error || r.rows.length === 0, r);
r = await as("authenticated", A, `insert into public.banned_words (word) values ('rico')`);
check("un usuario común no cambia la lista", !!r.error, r);
r = await as("authenticated", ADM, `insert into public.banned_words (word) values ('  ESTAFADORES ') returning word`);
check("el admin agrega palabras y se guardan normalizadas", r.rows?.[0]?.word === "estafadores", r);
r = await as("service_role", "", `update public.places set short_fact = 'Unos estafadores' where id = $1`, [P["lugar-5"]]);
check("la palabra nueva se bloquea al instante", /texto_no_permitido:dato:palabra/.test(r.error ?? ""), r);

console.log("\nFotos y registro de cambios (0006)");
for (let i = 0; i < 15; i++) await db.query(`insert into public.place_photos (place_id, storage_path, alt_text) values ($1, $2, 'Foto de prueba')`, [P["lugar-5"], `lugares/x/${i}.webp`]);
r = await as("service_role", "", `insert into public.place_photos (place_id, storage_path, alt_text) values ($1, 'lugares/x/16.webp', 'Foto de prueba')`, [P["lugar-5"]]);
check("máximo 15 fotos por lugar", /limite_fotos/.test(r.error ?? ""), r);
r = await as("service_role", "", `insert into public.place_changes (place_id, user_id, kind, detail) values ($1, $2, 'ficha', 'Cambió el horario') returning id`, [P["lugar-4"], A]);
check("el servidor anota cambios", r.rows?.length === 1, r);
r = await as("authenticated", A, `select * from public.place_changes`);
check("un usuario común no lee el registro de cambios", !!r.error || r.rows.length === 0, r);
r = await as("authenticated", A, `insert into public.place_changes (place_id, kind) values ($1, 'ficha')`, [P["lugar-4"]]);
check("ni escribe en él", !!r.error, r);
r = await as("authenticated", ADM, `update public.place_changes set reviewed = true returning id`);
check("el admin marca cambios como revisados", r.rows?.length >= 1, r);

console.log("\nReportes de lugares (0006)");
await db.exec(`insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c2', 'c2@test.com'), ('00000000-0000-0000-0000-0000000000c3', 'c3@test.com')`);
r = await as("anon", "", `insert into public.place_reports (place_id, reason) values ($1, 'Fotos falsas')`, [P["lugar-3"]]);
check("sin sesión no se reporta", !!r.error, r);
r = await as("authenticated", A, `insert into public.place_reports (place_id, reason) values ($1, 'No es borrador visible')`, [P["lugar-7"]]);
check("no se reportan borradores", !!r.error, r);
r = await as("authenticated", A, `insert into public.place_reports (place_id, reason, resolved) values ($1, 'Fotos falsas', true)`, [P["lugar-3"]]);
check("no se puede marcar resuelto al reportar", !!r.error, r);
r = await as("authenticated", A, `insert into public.place_reports (place_id, reason) values ($1, 'Fotos falsas')`, [P["lugar-3"]]);
check("con sesión se reporta un lugar publicado", !r.error, r);
r = await as("authenticated", A, `insert into public.place_reports (place_id, reason) values ($1, 'Otra vez')`, [P["lugar-3"]]);
check("una persona reporta una sola vez cada lugar", !!r.error, r);
r = await as("authenticated", A, `select * from public.place_reports`);
check("los reportes no se leen desde el navegador", !!r.error || r.rows.length === 0, r);
await as("authenticated", B, `insert into public.place_reports (place_id, reason) values ($1, 'Dirección falsa')`, [P["lugar-3"]]);
await as("authenticated", "00000000-0000-0000-0000-0000000000c2", `insert into public.place_reports (place_id, reason) values ($1, 'Estafa')`, [P["lugar-3"]]);
r = await db.query(`select status from public.places where id = $1`, [P["lugar-3"]]);
check("3 reportes de cuentas nuevas no la ocultan (0008)", r.rows[0].status === "publicado", r.rows);
await db.exec(`update public.place_reports set resolved = true`);
await db.exec(`update public.profiles set created_at = now() - interval '30 days'`);
await db.exec(`delete from public.place_reports`);
await as("authenticated", A, `insert into public.place_reports (place_id, reason) values ($1, 'Fotos falsas')`, [P["lugar-3"]]);
await as("authenticated", B, `insert into public.place_reports (place_id, reason) values ($1, 'Dirección falsa')`, [P["lugar-3"]]);
r = await db.query(`select status from public.places where id = $1`, [P["lugar-3"]]);
check("con 2 reportes sigue publicado", r.rows[0].status === "publicado", r.rows);
await as("authenticated", "00000000-0000-0000-0000-0000000000c2", `insert into public.place_reports (place_id, reason) values ($1, 'Estafa')`, [P["lugar-3"]]);
r = await db.query(`select status from public.places where id = $1`, [P["lugar-3"]]);
check("con 3 reportes de cuentas con 7 días o más se oculta sola", r.rows[0].status === "oculto", r.rows);
await db.query(`update public.places set is_verified = true where id = $1`, [P["lugar-2"]]);
for (const u of [A, B, "00000000-0000-0000-0000-0000000000c2"]) await as("authenticated", u, `insert into public.place_reports (place_id, reason) values ($1, 'Estafa')`, [P["lugar-2"]]);
r = await db.query(`select status from public.places where id = $1`, [P["lugar-2"]]);
check("una ficha verificada no se oculta sola", r.rows[0].status === "publicado", r.rows);
r = await db.query(`select count(*)::int n from public.place_changes where place_id = $1 and kind = 'oculta-por-reportes'`, [P["lugar-3"]]);
check("y queda anotado para el admin", r.rows[0].n === 1, r.rows);

console.log("\nExtras (0007)");
r = await as("authenticated", ADM, `update public.places set opening_hours = '{"lun": ["08:00", "22:00"]}' where id = $1 returning id`, [P["lugar-1"]]);
check("el admin guarda el horario por día", r.rows?.length === 1, r);
r = await as("anon", "", `select opening_hours from public.places where id = $1`, [P["lugar-1"]]);
check("el horario se lee en público", r.rows?.[0]?.opening_hours?.lun?.[0] === "08:00", r);
r = await as("authenticated", ADM, `update public.places set opening_hours = '[1,2]' where id = $1`, [P["lugar-1"]]);
check("el horario tiene que ser un objeto", !!r.error, r);
r = await as("anon", "", `select public.contar_evento($1, 'views')`, [P["lugar-1"]]);
check("el navegador no puede sumar estadísticas", !!r.error, r);
r = await as("authenticated", A, `select public.contar_evento($1, 'views')`, [P["lugar-1"]]);
check("ni con sesión", !!r.error, r);
for (const t of ["views", "views", "whatsapp", "route"]) await as("service_role", "", `select public.contar_evento($1, $2)`, [P["lugar-1"], t]);
await as("service_role", "", `select public.contar_evento($1, 'views')`, [P["lugar-7"]]);
r = await db.query(`select place_id, views, whatsapp, route from public.place_stats`);
check("el servidor suma por día (y no cuenta borradores)", r.rows.length === 1 && r.rows[0].views === 2 && r.rows[0].whatsapp === 1 && r.rows[0].route === 1, r.rows);
r = await as("service_role", "", `select public.contar_evento($1, 'otra')`, [P["lugar-1"]]);
check("rechaza tipos de evento inventados", !!r.error, r);
r = await as("authenticated", B, `select * from public.place_stats`);
check("las estadísticas no se leen desde el navegador", !!r.error || r.rows.length === 0, r);
r = await as("authenticated", A, `insert into public.favorites (place_id) values ($1)`, [P["lugar-1"]]);
check("con sesión se guarda un favorito", !r.error, r);
r = await as("authenticated", A, `insert into public.favorites (place_id) values ($1)`, [P["lugar-7"]]);
check("no se guardan borradores", !!r.error, r);
r = await as("authenticated", A, `insert into public.favorites (user_id, place_id) values ($1, $2)`, [B, P["lugar-2"]]);
check("no se guardan favoritos a nombre de otro", !!r.error, r);
r = await as("authenticated", B, `select * from public.favorites`);
check("nadie ve los favoritos de otro", r.rows?.length === 0, r);
r = await as("authenticated", B, `delete from public.favorites where place_id = $1 returning place_id`, [P["lugar-1"]]);
check("nadie borra los favoritos de otro", r.rows?.length === 0, r);
r = await as("authenticated", A, `delete from public.favorites where place_id = $1 returning place_id`, [P["lugar-1"]]);
check("cada uno quita los suyos", r.rows?.length === 1, r);
r = await as("anon", "", `select * from public.favorites`);
check("sin sesión no hay favoritos", !!r.error, r);

console.log("\nAjustes de seguridad (0008)");
r = await as("anon", "", `select public.motivo_no_permitido('mierda', false)`);
check("el navegador no puede preguntar por la lista de palabras", !!r.error, r);
r = await as("authenticated", A, `select public.motivo_no_permitido('mierda', false)`);
check("ni con sesión", !!r.error, r);
r = await as("authenticated", A, `update public.profiles set display_name = 'Ana Pendeja' where id = $1`, [A]);
check("los disparadores siguen revisando (corren con su propio permiso)", /texto_no_permitido/.test(r.error ?? ""), r);
r = await as("authenticated", A, `select public.anotar_con_limite($1, $2, 'ficha', array['ficha'], 2, 'x')`, [A, P["lugar-4"]]);
check("el navegador no anota cambios con límite", !!r.error, r);
const anotados = [];
for (let i = 0; i < 3; i++) anotados.push((await as("service_role", "", `select public.anotar_con_limite($1, $2, 'ficha', array['ficha'], 2, 'cambio') as id`, ["00000000-0000-0000-0000-0000000000c3", P["lugar-4"]])).rows?.[0]?.id);
check("el límite atómico corta al llegar al máximo", anotados[0] != null && anotados[1] != null && anotados[2] == null, anotados);

console.log("\nVideo y redes (0009)");
r = await as("authenticated", ADM, `update public.places set instagram = 'https://www.instagram.com/milindo', website = 'https://milindo.ec/' where id = $1 returning id`, [P["lugar-1"]]);
check("el admin guarda redes y página web", r.rows?.length === 1, r);
r = await as("anon", "", `select instagram, website from public.places where id = $1`, [P["lugar-1"]]);
check("las redes se leen en público", r.rows?.[0]?.instagram === "https://www.instagram.com/milindo", r);
for (const [campo, valor, nombre] of [
  ["facebook", "https://instagram.com/x", "un enlace de otra red en Facebook"],
  ["instagram", "https://instagram.com.estafa.ru/x", "un dominio que imita a la red"],
  ["youtube", "http://youtube.com/x", "un enlace sin https"],
  ["website", "javascript:alert(1)", "un enlace que no es web"],
  ["tiktok", "https://user@tiktok.com/x", "un enlace con usuario escondido"],
  ["website", "https://ejemplo.com:8080/", "un enlace con puerto"],
  ["facebook", "https://evil.com?.facebook.com", "un dominio falso escondido tras ?"],
  ["facebook", "https://evil.com#.facebook.com", "un dominio falso escondido tras #"],
]) {
  r = await as("authenticated", ADM, `update public.places set ${campo} = $2 where id = $1`, [P["lugar-1"], valor]);
  check(`la base rechaza ${nombre}`, !!r.error, r);
}
r = await as("authenticated", ADM, `update public.places set youtube = 'https://youtu.be/abc', tiktok = 'https://www.tiktok.com/@milindo', facebook = 'https://m.facebook.com/milindo' where id = $1 returning id`, [P["lugar-1"]]);
check("acepta subdominios de la red (m.facebook.com, www.tiktok.com) y youtu.be", r.rows?.length === 1, r);
r = await as("authenticated", ADM, `update public.places set website = 'https://putas.com/' where id = $1`, [P["lugar-1"]]);
check("los enlaces pasan por el filtro de palabras", /texto_no_permitido:web/.test(r.error ?? ""), r);

const vid = (lugar, n = "11111111-1111-1111-1111-111111111111") => `lugares/${lugar}/${n}.mp4`;
r = await as("authenticated", A, `insert into public.place_videos (place_id, storage_path, duration_seconds, size_bytes) values ($1, $2, 30, 1000)`, [P["lugar-1"], vid(P["lugar-1"])]);
check("nadie sube un video desde el navegador (ni siendo dueño)", !!r.error, r);
r = await as("authenticated", ADM, `insert into public.place_videos (place_id, storage_path, duration_seconds, size_bytes) values ($1, $2, 30, 1000)`, [P["lugar-1"], vid(P["lugar-1"])]);
check("ni el admin desde el navegador (lo hace el servidor)", !!r.error, r);
r = await as("service_role", "", `insert into public.place_videos (place_id, storage_path, duration_seconds, size_bytes) values ($1, $2, 30, 1000)`, [P["lugar-1"], vid(P["lugar-2"])]);
check("el archivo tiene que estar en la carpeta de su lugar", !!r.error, r);
r = await as("service_role", "", `insert into public.place_videos (place_id, storage_path, duration_seconds, size_bytes) values ($1, $2, 120, 1000)`, [P["lugar-1"], vid(P["lugar-1"])]);
check("máximo 90 segundos", !!r.error, r);
r = await as("service_role", "", `insert into public.place_videos (place_id, storage_path, duration_seconds, size_bytes) values ($1, $2, 30, 60000000)`, [P["lugar-1"], vid(P["lugar-1"])]);
check("máximo 50 MB", !!r.error, r);
r = await as("service_role", "", `insert into public.place_videos (place_id, storage_path, poster_path, duration_seconds, size_bytes) values ($1, $2, $3, 30, 1000)`, [P["lugar-1"], vid(P["lugar-1"]), `lugares/${P["lugar-1"]}/22222222-2222-2222-2222-222222222222.webp`]);
check("el servidor guarda el video", !r.error, r);
r = await as("service_role", "", `insert into public.place_videos (place_id, storage_path, duration_seconds, size_bytes) values ($1, $2, 30, 1000)`, [P["lugar-1"], vid(P["lugar-1"], "33333333-3333-3333-3333-333333333333")]);
check("un solo video por negocio", !!r.error, r);
await as("service_role", "", `insert into public.place_videos (place_id, storage_path, duration_seconds, size_bytes) values ($1, $2, 30, 1000)`, [P["lugar-7"], vid(P["lugar-7"])]);
r = await as("anon", "", `select place_id, storage_path from public.place_videos`);
check("en público se ve el video de un lugar publicado y no el de un borrador", r.rows?.length === 1 && r.rows[0].place_id === P["lugar-1"], r);
r = await as("anon", "", `select size_bytes from public.place_videos`);
check("el tamaño del archivo no se lee en público", !!r.error, r);
r = await as("authenticated", A, `update public.place_videos set hidden = false where place_id = $1 returning place_id`, [P["lugar-1"]]);
check("nadie cambia un video desde el navegador", !!r.error || r.rows?.length === 0, r);
r = await as("authenticated", A, `delete from public.place_videos where place_id = $1 returning place_id`, [P["lugar-1"]]);
check("nadie borra un video desde el navegador", !!r.error || r.rows?.length === 0, r);
r = await as("authenticated", A, `insert into storage.objects (bucket_id, name) values ('videos-lugares', 'x.mp4')`);
check("nadie sube al bucket de videos sin el permiso firmado", !!r.error, r);
r = await db.query(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'videos-lugares'`);
check("bucket de videos: público, 50 MB, solo videos y portada", r.rows[0]?.public === true && Number(r.rows[0].file_size_limit) === 52428800 && r.rows[0].allowed_mime_types.length === 5, r.rows);

await db.exec(`delete from public.place_reports; update public.places set status = 'publicado', is_verified = true where slug = 'lugar-1'`);
const C2 = "00000000-0000-0000-0000-0000000000c2";
r = await as("authenticated", A, `insert into public.place_reports (place_id, reason, target) values ($1, 'Video inapropiado', 'video')`, [P["lugar-2"]]);
check("no se reporta un video que no existe", !!r.error, r);
for (const u of [A, B]) await as("authenticated", u, `insert into public.place_reports (place_id, reason, target) values ($1, 'Video inapropiado', 'video')`, [P["lugar-1"]]);
r = await as("authenticated", A, `insert into public.place_reports (place_id, reason) values ($1, 'Estafa')`, [P["lugar-1"]]);
check("la misma persona puede reportar el video y también la ficha", !r.error, r);
r = await as("authenticated", A, `insert into public.place_reports (place_id, reason, target) values ($1, 'Otra vez', 'video')`, [P["lugar-1"]]);
check("pero el video una sola vez", !!r.error, r);
r = await db.query(`select hidden from public.place_videos where place_id = $1`, [P["lugar-1"]]);
check("con 2 reportes el video sigue visible", r.rows[0].hidden === false, r.rows);
await as("authenticated", C2, `insert into public.place_reports (place_id, reason, target) values ($1, 'Video inapropiado', 'video')`, [P["lugar-1"]]);
r = await db.query(`select v.hidden, p.status from public.place_videos v join public.places p on p.id = v.place_id where v.place_id = $1`, [P["lugar-1"]]);
check("con 3 reportes se oculta SOLO el video (aunque la ficha sea verificada)", r.rows[0].hidden === true && r.rows[0].status === "publicado", r.rows);
r = await as("anon", "", `select place_id from public.place_videos`);
check("el video oculto ya no se ve en público", r.rows?.length === 0, r);
r = await db.query(`select count(*)::int n from public.place_changes where place_id = $1 and kind = 'video-oculto-por-reportes'`, [P["lugar-1"]]);
check("y queda anotado para el admin", r.rows[0].n === 1, r.rows);
r = await db.query(`select video_review from public.places where id = $1`, [P["lugar-1"]]);
check("el próximo video de ese lugar quedará en revisión", r.rows[0].video_review === true, r.rows);
r = await as("anon", "", `select video_review from public.places where id = $1`, [P["lugar-1"]]);
check("la marca de revisión no se lee en público", !!r.error, r);
r = await as("authenticated", ADM, `select place_id, hidden from public.place_videos`);
check("el admin ve también los ocultos", r.rows?.length === 2, r);
for (const t of ["video", "video"]) await as("service_role", "", `select public.contar_evento($1, $2)`, [P["lugar-2"], t]);
r = await db.query(`select video from public.place_stats where place_id = $1`, [P["lugar-2"]]);
check("se cuentan las reproducciones del video", r.rows[0]?.video === 2, r.rows);

console.log("\nBuscador en la base (0010)");
await db.exec(`update public.places set name = 'Malecón 2000', sector = 'Centro' where slug = 'lugar-4';
  update public.places set name = 'Encebollados Doña Peta', sector = 'Alborada', short_fact = 'Desde 1985' where slug = 'lugar-5';
  update public.places set name = 'Lugar Siete del Malecón', status = 'borrador' where slug = 'lugar-7';`);
const buscar = async (q, rol = "anon") => (await as(rol, rol === "anon" ? "" : A, `select p.name from public.buscar_lugares($1, 'guayaquil') b join public.places p on p.id = b.id`, [q])).rows?.map((x) => x.name);
r = await buscar("malecon");
check("sin tildes ni mayúsculas, y sin borradores", JSON.stringify(r) === JSON.stringify(["Malecón 2000"]), r);
r = await buscar("MALECÓN centro");
check("todas las palabras tienen que estar (nombre o sector)", JSON.stringify(r) === JSON.stringify(["Malecón 2000"]), r);
r = await buscar("encebolado");
check("tolera errores de escritura (encebolado)", r?.[0] === "Encebollados Doña Peta", r);
r = await buscar("dona peta alborada");
check("la ñ se busca como n", r?.[0] === "Encebollados Doña Peta", r);
r = await buscar("1985");
check("busca también en el dato corto", r?.[0] === "Encebollados Doña Peta", r);
r = await buscar("centro");
check("primero los que lo tienen en el nombre... y si no, todos los del sector", r?.length >= 2 && r.includes("Malecón 2000"), r);
r = await buscar("xyzw qqq");
check("sin coincidencias devuelve vacío", r?.length === 0, r);
r = await buscar("   ");
check("una búsqueda vacía no devuelve todo", r?.length === 0, r);
r = await buscar("lugar", "authenticated");
check("con sesión tampoco aparecen borradores", !r?.includes("Lugar Siete del Malecón"), r);

console.log("\nLímite del contador de visitas (0011)");
const H = "a".repeat(64);
r = await as("anon", "", `select public.registrar_evento($1, $2, 'views')`, [H, P["lugar-1"]]);
check("el navegador no puede registrar eventos", !!r.error, r);
await db.exec(`delete from public.place_stats; delete from public.event_limits`);
let contados = 0;
for (let i = 0; i < 25; i++) if ((await as("service_role", "", `select public.registrar_evento($1, $2, 'whatsapp') as ok`, [H, P["lugar-1"]])).rows?.[0]?.ok) contados++;
r = await db.query(`select whatsapp from public.place_stats where place_id = $1`, [P["lugar-1"]]);
check("una misma huella cuenta como máximo 20 veces al día el mismo evento", contados === 20 && r.rows[0]?.whatsapp === 20, { contados, filas: r.rows });
r = await as("service_role", "", `select public.registrar_evento($1, $2, 'whatsapp') as ok`, ["b".repeat(64), P["lugar-1"]]);
check("otra huella sí cuenta", r.rows?.[0]?.ok === true, r);
r = await as("service_role", "", `select public.registrar_evento('1.2.3.4', $1, 'views')`, [P["lugar-1"]]);
check("no acepta una IP en lugar de la huella cifrada", !!r.error, r);
r = await as("authenticated", A, `select * from public.event_limits`);
check("las huellas no se leen desde el navegador", !!r.error, r);

console.log("\nErrores del servidor (0012)");
r = await as("anon", "", `select public.anotar_error('/x', 'render', 'falla')`);
check("el navegador no puede anotar errores", !!r.error, r);
for (let i = 0; i < 3; i++) await as("service_role", "", `select public.anotar_error('/buscar', 'render', 'falla igual')`);
await as("service_role", "", `select public.anotar_error('/buscar', 'render', 'otra falla')`);
r = await db.query(`select message, times from public.error_log order by message`);
check("los errores iguales se agrupan", r.rows.length === 2 && r.rows.find((x) => x.message === "falla igual")?.times === 3, r.rows);
r = await as("authenticated", A, `select * from public.error_log`);
check("un usuario normal no ve los errores", r.rows?.length === 0 || !!r.error, r);
r = await as("authenticated", ADM, `update public.error_log set resolved = true returning id`);
check("el admin los ve y los marca resueltos", r.rows?.length === 2, r);
r = await as("authenticated", ADM, `update public.error_log set message = 'cambiado' returning id`);
check("pero no cambia su contenido", !!r.error, r);

console.log("\nArreglos de la auditoría (0013)");
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'd1@test.com', '{"full_name":"Mierda Puta"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'd2@test.com', '{"full_name":"Soporte MiLindo"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'd3@test.com', '{"name":"Ana\u200b María"}')`);
r = await db.query(`select id, display_name from public.profiles where id::text like '%0000000000d%' order by id`);
check("al crear la cuenta, un nombre con insultos queda como Visitante", r.rows[0]?.display_name === "Visitante", r.rows);
check("y uno que imita a la guía también", r.rows[1]?.display_name === "Visitante", r.rows);
check("las letras invisibles del nombre de Google se quitan (no cortan el registro)", r.rows[2]?.display_name === "Ana M.", r.rows);
r = await as("authenticated", A, `update public.profiles set display_name = 'Admin Oficial' where id = $1`, [A]);
check("al editar, un nombre reservado se rechaza", /texto_no_permitido:nombre:reservado/.test(r.error ?? ""), r);
r = await as("authenticated", A, `update public.profiles set display_name = 'Ana Lucía' where id = $1 returning id`, [A]);
check("un nombre normal se guarda", r.rows?.length === 1, r);
const sol = (n) => as("service_role", "", `insert into public.business_requests (business_name, category_id, city_id, contact_name, whatsapp, user_id) values ($1, $2, $3, 'Ana', '593991234567', $4)`, [`Negocio ${n}`, cat, gye, B]);
for (let i = 1; i <= 3; i++) await sol(i);
r = await sol(4);
check("máximo 3 solicitudes pendientes por cuenta, contado en la base", /limite_solicitudes/.test(r.error ?? ""), r);
await db.exec(`set session_replication_role = replica; update public.business_requests set status = 'rechazada', updated_at = now() - interval '200 days' where business_name = 'Negocio 1'; set session_replication_role = origin;`); // sin el disparador de updated_at
await sol(5);
r = await db.query(`select count(*)::int n from public.business_requests where business_name = 'Negocio 1'`);
check("las solicitudes rechazadas hace más de 180 días se borran solas", r.rows[0].n === 0, r.rows);
r = await as("service_role", "", `insert into public.place_photos (place_id, storage_path, alt_text) values ($1, 'lugares/x/0.webp', 'Foto repetida')`, [P["lugar-5"]]);
check("una misma foto no se registra dos veces", !!r.error, r);

console.log("\nPaumi: tope de mensajes (0014)");
r = await as("anon", "", `select public.usar_paumi($1, 3, 5)`, ["c".repeat(64)]);
check("el navegador no puede gastar mensajes de Paumi", !!r.error, r);
const usar = async (h) => (await as("service_role", "", `select public.usar_paumi($1, 3, 5) as r`, [h])).rows?.[0]?.r;
const res = [];
for (let i = 0; i < 4; i++) res.push(await usar("c".repeat(64)));
check("cada huella tiene su máximo del día", JSON.stringify(res) === JSON.stringify(["ok", "ok", "ok", "persona"]), res);
const otros = [await usar("d".repeat(64)), await usar("e".repeat(64)), await usar("f".repeat(64))];
check("y nunca se pasa el tope diario total", JSON.stringify(otros) === JSON.stringify(["ok", "ok", "total"]), otros);
r = await as("authenticated", A, `select * from public.paumi_usage`);
check("el uso de Paumi no se lee desde el navegador", !!r.error, r);

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
