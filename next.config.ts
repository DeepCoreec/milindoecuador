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
  // La página no usa cámara, micrófono, ubicación ni pagos del navegador.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Aísla la ventana de otras pestañas abiertas desde otros sitios.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // no anunciar qué tecnología usa el servidor
  images: {
    // Solo fotos del bucket público de Supabase (ningún otro sitio puede usar el optimizador)
    remotePatterns: [
      // Solo NUESTRO proyecto de Supabase (no cualquier *.supabase.co: evita que otros usen el optimizador de imágenes)
      { protocol: "https", hostname: hostSupabase(), pathname: "/storage/v1/object/public/fotos-lugares/**" },
      // Solo en desarrollo: el Supabase de prueba local
      ...(desarrollo ? [{ protocol: "http" as const, hostname: "127.0.0.1", port: "54321", pathname: "/storage/v1/object/public/fotos-lugares/**" }] : []),
    ],
    dangerouslyAllowLocalIP: desarrollo,
  },
  async headers() {
    return [{ source: "/(.*)", headers: cabecerasDeSeguridad }];
  },
};

export default nextConfig;
