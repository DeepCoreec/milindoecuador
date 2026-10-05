"""Arma el contenido (HTML) de las 5 maquetas a partir de piezas comunes."""
import re, os, json
A = os.path.dirname(os.path.abspath(__file__)) + "/../arte/"  # afiches de categoría

def afiche(nombre):
    s = open(A + f"categoria-{nombre}.svg").read()
    return re.sub(r' role="img" aria-label="[^"]*"', "", s)

I = {
 "buscar": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
 "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
 "menu": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
 "chat": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
 "compartir": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
 "check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>',
 "abajo": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
 "escudo": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>',
}

def cabecera(actual=""):
    return f'''<header class="cab">
  <div class="ancho">
    <a class="marca" href="#">Mi Lindo Ecuador</a>
    <span class="ciudad oculto-movil">{I["pin"]}Guayaquil</span>
    <nav class="nav" aria-label="Principal">
      <a class="enlace-nav oculto-movil" href="#"{' aria-current="page"' if actual=="explorar" else ''}>Explorar</a>
      <a class="enlace-nav oculto-movil" href="#">Entrar</a>
      <a class="btn btn--chico oculto-movil" href="#">Registra tu negocio</a>
      <button class="icono-btn solo-movil" aria-label="Buscar">{I["buscar"]}</button>
      <button class="icono-btn solo-movil" aria-label="Abrir menú">{I["menu"]}</button>
    </nav>
  </div>
</header>'''

PIE = '''<footer class="pie">
  <div class="ancho">
    <div><span class="marca">Mi Lindo Ecuador</span><br>La guía de Guayaquil hecha por su gente.<br>Un proyecto de DeepCore.</div>
    <nav aria-label="Pie de página">
      <a href="#">Registra tu negocio</a><a href="#">Planes para negocios</a><a href="#">Términos</a><a href="#">Privacidad</a>
    </nav>
  </div>
</footer>'''

PRINCIPALES = [("restaurantes", "Restaurantes"), ("hoteles", "Hoteles"), ("turismo", "Turismo"), ("ejercicio", "Ejercicio"), ("paseos", "Paseos")]
def barra(activa=None):
    items = "\n".join(
        f'    <a class="cat" href="#"{" aria-current=\"page\"" if k == activa else ""}><span class="arte" aria-hidden="true">{afiche(k)}</span><span>{n}</span></a>'
        for k, n in PRINCIPALES)
    return f'''<nav class="cats" aria-label="Categorías">
{items}
    <button class="cat cat--todas" aria-expanded="false"><span class="arte" aria-hidden="true">{afiche("todas")}</span><span>Todas las categorías</span></button>
  </nav>'''

def tarjeta(nombre, datos, pie_izq, pie_der="", insignias="", foto="Foto del lugar", tono=""):
    return f'''<a class="tarjeta" href="#">
      <div class="foto{(' foto--' + tono) if tono else ''}">{('<div class="insignias">' + insignias + '</div>') if insignias else ''}<span>{foto}</span></div>
      <h3>{nombre}</h3>
      <p class="datos">{datos}</p>
      <div class="pie-tarjeta">{pie_izq}{pie_der}</div>
    </a>'''

def estrellas(n, c, corto=False):
    return f'<span class="estrellas" aria-label="{n} de 5 estrellas, {c} reseñas"><span class="ic" aria-hidden="true">★</span><b>{n}</b>({c}{"" if corto else " reseñas"})</span>'
SIN = '<span class="estrellas">Sin reseñas todavía</span>'
EJ = '<span class="ins ins--ejemplo">Ejemplo</span>'
DEST = '<span class="ins ins--destacado">Destacado</span>'
VERI = f'<span class="ins ins--verificado">{I["check"]}Verificado</span>'

# ======================= 1. INICIO =======================
inicio = f'''<div class="p">
{cabecera()}
<main>
  <section class="ancho" style="display:grid;grid-template-columns:minmax(0, 1fr);gap:20px;padding-top:40px;padding-bottom:24px">
    <h1 class="rotulo-hero">Guayaquil, de punta a punta</h1>
    <p class="bajada">Dónde comer, dónde dormir y qué visitar, recomendado por la gente de aquí. Escríbele directo al negocio por WhatsApp.</p>
    <form class="buscador" role="search" onsubmit="return false">
      {I["buscar"]}<input type="search" aria-label="Buscar lugares" placeholder="Encebollado, hostal, malecón…"><button type="submit">Buscar</button>
    </form>
  </section>
  <div class="ancho" style="padding-bottom:8px">
    <img class="panorama" src="{{PANORAMA}}" alt="Ilustración del Cerro Santa Ana de noche: casas de colores, la escalinata, el faro y una balandra en el río Guayas">
  </div>
  <section class="ancho seccion" style="padding-bottom:16px" aria-labelledby="t-cat">
    <div class="seccion-cab"><h2 class="rotulo-seccion" id="t-cat">¿Qué buscas hoy?</h2></div>
    {barra()}
  </section>
  <section class="ancho seccion" style="padding-top:24px" aria-labelledby="t-ence">
    <div class="seccion-cab"><h2 class="rotulo-seccion" id="t-ence">Dónde comer encebollado</h2><a class="btn btn--texto" href="#">Ver todos</a></div>
    <div class="fila-desliza">
      {tarjeta("La Sazón del Estero", "Restaurante en el centro", estrellas("4,8", 32, True), '<span class="precio" aria-label="Precio económico">$</span>', DEST + EJ, tono="mango")}
      {tarjeta("El Rincón de Doña Rosa", "Restaurante en Urdesa", estrellas("4,6", 18, True), '<span class="precio">$</span>', VERI + EJ, tono="mango")}
      {tarjeta("Encebollados El Puerto", "Restaurante en la Alborada", estrellas("4,5", 41, True), '<span class="precio">$</span>', EJ, tono="mango")}
      {tarjeta("Picantería La Ría", "Restaurante en el sur", SIN, '<span class="precio">$</span>', EJ, tono="mango")}
    </div>
  </section>
  <section class="banda">
    <div class="ancho seccion" aria-labelledby="t-imp">
      <div class="seccion-cab"><h2 class="rotulo-seccion" id="t-imp">Imperdibles de Guayaquil</h2><a class="btn btn--texto" href="#">Ver lugares turísticos</a></div>
      <div class="fila-desliza">
        {tarjeta("Malecón 2000", "Paseo a orillas del río Guayas", SIN, '<span class="ins">Entrada libre</span>')}
        {tarjeta("Barrio Las Peñas", "El barrio más antiguo de la ciudad", SIN, '<span class="ins">444 escalones</span>')}
        {tarjeta("Parque Seminario", "El parque de las iguanas, en el centro", SIN, '<span class="ins">Entrada libre</span>')}
        {tarjeta("Isla Santay", "Manglares, a pie o en bici por el puente", SIN, '<span class="ins">Naturaleza</span>')}
      </div>
    </div>
  </section>
  <section class="ancho seccion">
    <div class="llamado">
      <div><h2 class="rotulo-seccion">¿Tienes un negocio en Guayaquil?</h2>
      <p>Publica tu ficha gratis con fotos, horario y tu WhatsApp. Si quieres salir primero, destácala desde 1 $ por semana.</p></div>
      <a class="btn btn--principal" href="#">Registrar mi negocio</a>
    </div>
  </section>
</main>
{PIE}
</div>'''

# ======================= 2. CATEGORÍA =======================
rest = [
 ("Cangrejal Doña Tere", "Restaurante en Urdesa", estrellas("4,8", 32, True), "$$", DEST + EJ),
 ("La Sazón del Estero", "Restaurante en el centro", estrellas("4,8", 21, True), "$", VERI + EJ),
 ("Sabor a Manglar", "Restaurante en Samborondón", estrellas("4,4", 12, True), "$$", EJ),
 ("Café Mirador 444", "Restaurante en Las Peñas", estrellas("4,7", 9, True), "$", EJ),
 ("Parrilla del Salado", "Restaurante en el centro norte", estrellas("4,2", 27, True), "$$$", EJ),
 ("Bolones de la Garzota", "Restaurante en La Garzota", SIN, "$", EJ),
]
categoria = f'''<div class="p">
{cabecera("explorar")}
<main class="ancho" style="padding-top:24px;padding-bottom:64px">
  <p class="miga"><a href="#">Guayaquil</a><span aria-hidden="true">/</span><span>Restaurantes</span></p>
  <h1 class="rotulo-hero">Restaurantes en Guayaquil</h1>
  <p class="bajada" style="margin-top:12px">Encebollado, cangrejo, ceviche y mucho más. Ordenados con los destacados primero.</p>
  <div style="margin-top:28px">{barra("restaurantes")}</div>
  <form style="display:flex;flex-wrap:wrap;gap:16px;align-items:end;margin:24px 0 32px" onsubmit="return false" aria-label="Filtros">
    <div class="campo filtro-sector" style="flex:1 1 200px;max-width:260px"><label for="f-sector">Sector</label><select class="entrada" id="f-sector"><option>Todos los sectores</option><option>Centro</option><option>Urdesa</option><option>Samborondón</option></select></div>
    <div class="campo"><span class="etq" id="f-precio">Precio</span><div class="chips" role="group" aria-labelledby="f-precio"><button class="chip" aria-pressed="true">$</button><button class="chip" aria-pressed="false">$$</button><button class="chip" aria-pressed="false">$$$</button></div></div>
    <div class="campo filtro-orden"><label for="f-orden">Ordenar</label><select class="entrada" id="f-orden"><option>Destacados primero</option><option>Mejor calificados</option><option>Más reseñas</option></select></div>
  </form>
  <p class="datos" style="margin:0 0 16px">6 lugares de ejemplo</p>
  <div class="rejilla rejilla--3">
    {"".join(tarjeta(n, d, e, f'<span class="precio">{p}</span>', ins, tono="mango") for n, d, e, p, ins in rest)}
  </div>
</main>
{PIE}
</div>'''

# ======================= 3. FICHA =======================
ficha = f'''<div class="p">
{cabecera("explorar")}
<main class="ancho">
  <p class="miga" style="margin-top:24px"><a href="#">Guayaquil</a><span aria-hidden="true">/</span><a href="#">Restaurantes</a><span aria-hidden="true">/</span><span>Cangrejal Doña Tere</span></p>
  <div class="galeria">
    <div class="foto foto--mango principal"><span>Foto principal del lugar (3:2)</span></div>
    <div class="foto foto--mango oculto-movil"><span>Foto del plato</span></div>
    <div class="foto foto--mango oculto-movil"><span>Foto del local</span></div>
  </div>
  <div class="ficha">
      <div class="ficha-cab" style="display:grid;gap:12px;min-width:0">
        <div style="display:flex;flex-wrap:wrap;gap:8px">{DEST}{VERI}{EJ}</div>
        <h1 class="titulo-ficha">Cangrejal Doña Tere</h1>
        <p class="datos" style="font-size:16px;line-height:24px">Restaurante en Urdesa, precio medio ($$)</p>
        {estrellas("4,8", 32)}
        <div class="acciones" style="margin-top:8px">
          <a class="btn btn--whatsapp" href="#">{I["chat"]}Escribir por WhatsApp</a>
          <a class="btn" href="#">{I["pin"]}Cómo llegar</a>
          <button class="btn btn--texto">{I["compartir"]}Compartir</button>
        </div>
      </div>
    <div class="ficha-resto" style="display:grid;gap:32px;min-width:0">
      <section aria-labelledby="t-hist" style="display:grid;gap:12px">
        <h2 class="rotulo-seccion" id="t-hist">La historia</h2>
        <p class="historia">[Ejemplo] Doña Tere empezó vendiendo cangrejos en una mesa frente a su casa. Hoy sus hijos atienden el local, pero la salsa sigue siendo la receta de ella, y los domingos todavía se sienta en la caja.</p>
      </section>
      <section aria-labelledby="t-res" style="display:grid;gap:8px">
        <div class="seccion-cab" style="margin-bottom:8px"><h2 class="rotulo-seccion" id="t-res">Reseñas</h2><a class="btn btn--chico" href="#">Escribir una reseña</a></div>
        <div class="resumen-resenas"><span class="nota-grande">4,8</span><div><span class="estrellas"><span class="ic" aria-hidden="true">★★★★★</span></span><div class="datos">32 reseñas de ejemplo</div></div></div>
        <article class="resena">
          <div class="cab-r"><b>Andrea M.</b><span class="datos">12 de septiembre de 2026</span></div>
          <span class="estrellas" aria-label="5 de 5 estrellas"><span class="ic" aria-hidden="true">★★★★★</span></span>
          <p>El cangrejo llegó rápido y bien servido. Los fines de semana conviene ir antes de la una.</p>
          <div class="respuesta"><strong>Respuesta del negocio</strong>Gracias, Andrea. Te esperamos de nuevo.</div>
        </article>
        <article class="resena">
          <div class="cab-r"><b>Luis P.</b><span class="datos">3 de septiembre de 2026</span></div>
          <span class="estrellas" aria-label="4 de 5 estrellas"><span class="ic" aria-hidden="true">★★★★</span></span>
          <p>Buena sazón y buen precio. Hay que tener paciencia para conseguir mesa.</p>
        </article>
        <a class="btn btn--texto" href="#" style="justify-self:start;margin-top:8px">Ver las 32 reseñas</a>
      </section>
    </div>
    <aside class="caja ficha-info" aria-labelledby="t-info">
      <h2 id="t-info" style="margin:0;font:600 18px/24px var(--f-sans)">Información</h2>
      <dl class="dl">
        <dt>Horario</dt><dd>Martes a domingo, de 12:00 a 22:00</dd>
        <dt>Dirección</dt><dd>[Dirección del negocio], Urdesa</dd>
        <dt>Precio</dt><dd>$$ (precio medio)</dd>
        <dt>WhatsApp</dt><dd>[Número del negocio]</dd>
      </dl>
      <a class="btn btn--whatsapp oculto-movil" href="#">{I["chat"]}Escribir por WhatsApp</a>
      <p class="datos" style="margin:0">¿Este es tu negocio? <a href="#">Pide destacarlo</a></p>
    </aside>
  </div>
</main>
{PIE}
</div>'''

# ======================= 4. REGISTRO =======================
cats11 = ["Restaurantes", "Hoteles", "Lugares turísticos", "Dónde hacer ejercicio", "Dónde pasear", "Cafés y heladerías", "Vida nocturna", "Museos y cultura", "Compras y mercados", "Para niños", "Naturaleza y aventura"]
registro = f'''<div class="p">
{cabecera()}
<main class="ancho" style="padding-top:32px;padding-bottom:64px">
  <div style="display:grid;gap:40px;align-items:start" class="registro">
    <div style="display:grid;gap:16px;max-width:520px">
      <p class="miga"><a href="#">Negocios</a><span aria-hidden="true">/</span><span>Registro</span></p>
      <h1 class="rotulo-hero">Registra tu negocio gratis</h1>
      <p class="bajada">Llena tus datos y revisamos tu solicitud. Cuando tu ficha esté lista, te escribimos por WhatsApp.</p>
      <ul style="margin:8px 0 0;padding:0;list-style:none;display:grid;gap:12px">
        <li style="display:flex;gap:12px">{I["check"].replace('aria-hidden="true"','aria-hidden="true" style="width:22px;height:22px;flex:none;color:var(--exito)"')}<span>Ficha con fotos, horario, ubicación y tu WhatsApp</span></li>
        <li style="display:flex;gap:12px">{I["check"].replace('aria-hidden="true"','aria-hidden="true" style="width:22px;height:22px;flex:none;color:var(--exito)"')}<span>Reseñas de tus clientes y la opción de responderlas</span></li>
        <li style="display:flex;gap:12px">{I["check"].replace('aria-hidden="true"','aria-hidden="true" style="width:22px;height:22px;flex:none;color:var(--exito)"')}<span>Un enlace propio para compartir en Instagram y WhatsApp</span></li>
      </ul>
      <a class="btn btn--texto" href="#" style="justify-self:start">Ver planes para destacar tu negocio</a>
    </div>
    <form class="caja" style="gap:20px" onsubmit="return false" aria-labelledby="t-form">
      <h2 id="t-form" style="margin:0;font:600 20px/26px var(--f-sans)">Datos del negocio</h2>
      <div class="campo"><label for="r-nombre">Nombre del negocio</label><input class="entrada" id="r-nombre" placeholder="Ej.: Encebollados El Puerto"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px">
        <div class="campo"><label for="r-cat">Categoría</label><select class="entrada" id="r-cat">{"".join(f"<option>{c}</option>" for c in cats11)}</select></div>
        <div class="campo"><label for="r-sector">Sector</label><input class="entrada" id="r-sector" placeholder="Ej.: Urdesa, Centro, Alborada"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px">
        <div class="campo"><label for="r-contacto">Tu nombre</label><input class="entrada" id="r-contacto" autocomplete="name"></div>
        <div class="campo"><label for="r-wa">WhatsApp del negocio</label><div class="prefijo"><span>+593</span><input class="entrada" id="r-wa" inputmode="tel" placeholder="99 123 4567" aria-describedby="r-wa-ayuda"></div><span class="ayuda" id="r-wa-ayuda">Los clientes te escribirán a este número.</span></div>
      </div>
      <div class="campo"><label for="r-desc">¿Qué ofreces?</label><textarea class="entrada" id="r-desc" placeholder="Cuéntale a la gente qué te hace especial"></textarea></div>
      <div class="captcha">{I["escudo"].replace('aria-hidden="true"','aria-hidden="true" style="width:22px;height:22px;flex:none"')}<span>[Verificación de Cloudflare: comprueba que eres una persona]</span></div>
      <label class="casilla" for="r-terminos"><input type="checkbox" id="r-terminos"><span>Acepto los <a href="#">términos</a> y la <a href="#">política de privacidad</a>.</span></label>
      <button class="btn btn--principal" type="submit">Enviar solicitud</button>
    </form>
  </div>
</main>
{PIE}
</div>'''

# ======================= 5. PANEL ADMIN =======================
solicitudes = [("Encebollados El Puerto", "Restaurantes", "Alborada", "+593 99 123 4567", "5 oct. 2026"),
               ("Hostal Casa Celeste", "Hoteles", "Centro", "+593 98 765 4321", "4 oct. 2026"),
               ("Gimnasio al aire libre Samanes", "Dónde hacer ejercicio", "Norte", "+593 96 111 2233", "3 oct. 2026")]
filas = "\n".join(f'''        <tr><td><b>{n}</b><br><span class="datos">Ejemplo</span></td><td>{c}</td><td>{s}</td><td style="white-space:nowrap">{w}</td><td style="white-space:nowrap">{f}</td>
          <td><div class="acciones"><button class="btn btn--chico">Aprobar</button><button class="btn btn--chico btn--texto">Rechazar</button></div></td></tr>''' for n, c, s, w, f in solicitudes)
admin = f'''<div class="p">
<div class="admin">
  <aside class="lateral">
    <a class="marca" href="#">Mi Lindo Ecuador</a>
    <div class="datos" style="margin-top:4px">Panel de administración</div>
    <nav aria-label="Panel">
      <a class="item" href="#">Resumen</a>
      <a class="item" href="#" aria-current="page">Solicitudes <span class="contador">3</span></a>
      <a class="item" href="#">Lugares</a>
      <a class="item" href="#">Reseñas reportadas <span class="contador">1</span></a>
      <a class="item" href="#">Salir</a>
    </nav>
  </aside>
  <main class="contenido">
    <h1 class="rotulo-seccion" style="font-size:28px;line-height:34px">Solicitudes de negocios</h1>
    <p class="bajada" style="margin-top:8px">Revisa los datos y aprueba para crear la ficha como borrador. Escríbele al dueño por WhatsApp para pedirle fotos.</p>
    <div class="resumen">
      <div class="caja"><span class="datos">Pendientes</span><span class="num">3</span></div>
      <div class="caja"><span class="datos">Lugares publicados</span><span class="num">24</span></div>
      <div class="caja"><span class="datos">Reseñas reportadas</span><span class="num">1</span></div>
    </div>
    <div class="tabla-caja">
      <table>
        <caption style="text-align:left;padding:16px;font:600 16px/22px var(--f-sans)">Pendientes de revisión (datos de ejemplo)</caption>
        <thead><tr><th scope="col">Negocio</th><th scope="col">Categoría</th><th scope="col">Sector</th><th scope="col">WhatsApp</th><th scope="col">Recibida</th><th scope="col">Acción</th></tr></thead>
        <tbody>
{filas}
        </tbody>
      </table>
    </div>
  </main>
</div>
</div>'''

EXTRA_CSS = '@media (min-width: 900px) { .registro { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 64px; } }'
json.dump({"Inicio": inicio, "Categoria": categoria, "Ficha": ficha, "Registro": registro, "Admin": admin, "extra_css": EXTRA_CSS},
          open(os.path.dirname(os.path.abspath(__file__)) + "/pantallas.json", "w"), ensure_ascii=False)
print("ok")
