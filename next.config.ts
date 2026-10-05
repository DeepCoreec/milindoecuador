import type { NextConfig } from "next";

const desarrollo = process.env.NODE_ENV === "development";

// Política de contenido: de dónde puede cargar cosas la página.
// - Supabase: datos (https y wss para tiempo real) y fotos del bucket.
// - Cloudflare Turnstile: el captcha (script e iframe).
// Sin nonce para que las páginas públicas puedan ser estáticas (más rápidas); se revisa en el paso 5.4.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${desarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.supabase.co",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
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
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/fotos-lugares/**" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: cabecerasDeSeguridad }];
  },
};

export default nextConfig;
