import type { NextConfig } from "next";

const desarrollo = process.env.NODE_ENV === "development";

// Dirección de Supabase desde la configuración (si falta, se permite cualquier proyecto *.supabase.co).
// Así el navegador solo puede hablar con NUESTRO proyecto, y en desarrollo funciona el Supabase de prueba local.
function origenSupabase(): { http: string; ws: string } {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return { http: u.origin, ws: `${u.protocol === "https:" ? "wss" : "ws"}://${u.host}` };
  } catch {
    return { http: "https://*.supabase.co", ws: "wss://*.supabase.co" };
  }
}
const supabase = origenSupabase();

function hostSupabase(): string {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (u.protocol === "https:") return u.hostname;
  } catch {}
  return "*.supabase.co"; // sin configuración (desarrollo sin claves): no hay fotos de la base que mostrar
}

// Política de contenido: de dónde puede cargar cosas la página.
// - Supabase: datos (https y wss para tiempo real) y fotos del bucket.
// - Cloudflare Turnstile: el captcha (script e iframe).
// Sin nonce para que las páginas públicas puedan ser estáticas (más rápidas); se revisa en el paso 5.4.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${desarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${supabase.http}`,
  "font-src 'self'",
  // Videos de los negocios (versión 3): el bucket de Supabase; blob: para revisar el video antes de subirlo
  `media-src 'self' blob: ${supabase.http}`,
  `connect-src 'self' ${supabase.http} ${supabase.ws} https://challenges.cloudflare.com`,
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(desarrollo ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const cabecerasDeSeguridad = [
  { key: "Content-Security-Policy", value: csp },
  // Solo HTTPS durante 2 años, también en subdominios.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // El navegador no adivina tipos de archivo (evita ejecutar algo disfrazado).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nadie puede meter la página dentro de un iframe (evita engaños de clics).
  { key: "X-Frame-Options", value: "DENY" },
  // Al ir a otro sitio, solo se envía el dominio, no la ruta completa.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Sin cámara ni pagos del navegador. Micrófono y ubicación solo para esta página (el micrófono, para hablarle a
  // Paumi; el navegador igual pide permiso a la persona) y nunca para sitios metidos dentro.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self), payment=(), usb=()" },
  // Aísla la ventana de otras pestañas abiertas desde otros sitios.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// Fotos de la portada (Unsplash, Licencia Unsplash): SOLO estas, por su dirección exacta (src/lib/fondos-ciudad.ts).
// Pasan por el optimizador de la página, así el navegador las carga desde nuestro dominio (no hace falta tocar la CSP).
const FOTOS_PORTADA = ["/photo-1574570120297-2836722938eb", "/photo-1574570119220-01b7e3dfcc8d"];
// Fotos de las categorías (2026-11-01, src/lib/fotos-categorias.ts): también solo por su dirección exacta
const FOTOS_CATEGORIAS = [
  "/photo-1584208632869-05fa2b2a5934", "/photo-1566665797739-1674de7a421a", "/photo-1628004550522-02dc9cb7456e",
  "/photo-1739368732843-800f36a9b7d0", "/photo-1657249538847-1d91852580e9", "/photo-1495474472287-4d71bcdd2085",
  "/photo-1572116469696-31de0f17cc34", "/photo-1761617582647-5f9b510120b2", "/photo-1653414566918-004e6eef8ee6",
  "/photo-1575783970733-1aaedde1db74", "/photo-1612103183244-7598b792bb05", "/photo-1639776738932-956082f0b704",
  "/photo-1600714480856-dc99b28892eb",
];
export const FOTOS_UNSPLASH = [...FOTOS_PORTADA, ...FOTOS_CATEGORIAS];

const nextConfig: NextConfig = {
  poweredByHeader: false, // no anunciar qué tecnología usa el servidor
  images: {
    // Solo fotos del bucket público de Supabase (ningún otro sitio puede usar el optimizador)
    remotePatterns: [
      // Solo NUESTRO proyecto de Supabase (no cualquier *.supabase.co: evita que otros usen el optimizador de imágenes)
      { protocol: "https", hostname: hostSupabase(), pathname: "/storage/v1/object/public/fotos-lugares/**" },
      // Versión 5: afiches de eventos
      { protocol: "https", hostname: hostSupabase(), pathname: "/storage/v1/object/public/afiches-eventos/**" },
      ...FOTOS_UNSPLASH.map((pathname) => ({ protocol: "https" as const, hostname: "images.unsplash.com", pathname })),
      // Solo en desarrollo: el Supabase de prueba local
      ...(desarrollo
        ? (["fotos-lugares", "afiches-eventos"] as const).map((b) => ({ protocol: "http" as const, hostname: "127.0.0.1", port: "54321", pathname: `/storage/v1/object/public/${b}/**` }))
        : []),
    ],
    dangerouslyAllowLocalIP: desarrollo,
  },
  async headers() {
    return [{ source: "/(.*)", headers: cabecerasDeSeguridad }];
  },
};

export default nextConfig;
