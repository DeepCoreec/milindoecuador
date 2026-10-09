/** Dirección pública de una foto del bucket `fotos-lugares`. Cada parte del camino va escapada. */
export function urlPublicaFoto(urlSupabase: string, camino: string): string {
  return `${urlSupabase}/storage/v1/object/public/fotos-lugares/${camino.split("/").map(encodeURIComponent).join("/")}`;
}

/** Camino donde el panel guarda las fotos: lugares/<id del lugar>/<id al azar>.webp */
export const CAMINO_FOTO = /^lugares\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/;

/** Dirección pública de un archivo del bucket `videos-lugares` (video o portada), versión 3. */
export function urlPublicaVideo(urlSupabase: string, camino: string): string {
  return `${urlSupabase}/storage/v1/object/public/videos-lugares/${camino.split("/").map(encodeURIComponent).join("/")}`;
}
