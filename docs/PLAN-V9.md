# Mi Lindo Ecuador — Plan de la versión 9: lista para que los negocios se registren

> Pedido del usuario del 2026-10-30 (21:59–22:04): "si aún no hay locales porque la aplicación no está terminada como
> para que la gente suba sus negocios, entonces tendría que estar lista para eso, y de preferencia locales con fotos y
> buena descripción". Estado: **aprobado por el usuario el 2026-10-30** ("lo demás está bien"), **sin** la prueba completa
> con un negocio de ejemplo (eso no lo quiere). Fase 35. Sin librerías nuevas ni migraciones.

## Fase 35 · Listo para recibir negocios

### Lo que hace Claude
- **35.1 Descripción obligatoria al registrarse:** "¿Qué ofreces?" pasa a ser obligatoria, de al menos 40 letras.
- **35.2 Solo se publica con foto y descripción:** ya existe para los dueños (al publicar, la página pide al menos una
  foto y la descripción). No se cambia.
- **35.3 Primero los que tienen foto:** en las listas de categorías, después de los destacados y verificados, van
  primero los negocios con foto; en "Cerca de mí", a igual condición (abierto ahora), también.

### Lo que hace el usuario (Claude lo guía paso a paso)
- **35.4 Crear cuenta con correo:** dominio + Resend + plantillas en español (pasos 6.3 a 6.5 de la versión 2). Hoy
  solo funciona "Entrar con Google": el correo gratuito de Supabase no envía a cualquier persona.
- **35.5 Protecciones de las cuentas en Supabase:** captcha y confirmación por correo (PUESTA-EN-MARCHA §8.2 y §15).
- **35.6 Datos legales** del responsable en Términos y Privacidad (paso 5.2 de la versión 1).

**Puerta:** una persona sin cuenta de Google crea su cuenta con correo, registra su negocio con descripción, el admin
lo aprueba y el dueño lo publica con su foto.
