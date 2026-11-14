import { normalizar } from "@/lib/validacion/busqueda";

/*
 * Diccionario del buscador (versión 14, fase 44.1). La gente busca «almuerzo» o «ceviche», no «restaurantes»:
 * este archivo traduce lo que se dice a la categoría de la guía donde conviene mirar.
 * Está en el código (sin base de datos) y sin tildes. Para sumar una palabra, agregarla a la lista de su categoría.
 * Paumi usará este mismo diccionario en la fase 44.3.
 */

export type Sugerencia = { categoria: string; nombre: string };

/** [slug de la categoría, nombre, palabras que la gente usa (sin tildes, en singular)]. */
const DICCIONARIO: [string, string, string[]][] = [
  [
    "restaurantes",
    "Restaurantes",
    [
      "almuerzo", "almuerzos", "desayuno", "merienda", "cena", "comida", "comer", "hambre", "menu", "plato", "platos",
      "encebollado", "ceviche", "cangrejo", "cangrejos", "camaron", "camarones", "mariscos", "marisco", "pescado", "bolon", "bolones",
      "guatita", "seco", "caldo", "arroz", "parrilla", "parrillada", "asado", "pollo", "hamburguesa", "pizza", "sushi", "cevicheria",
      "picanteria", "tipico", "tipica", "restaurante", "restaurant", "marisqueria", "encocado", "fritada", "hornado", "churrasco",
    ],
  ],
  ["hoteles", "Hoteles", ["hotel", "hostal", "hospedaje", "alojamiento", "dormir", "habitacion", "cuarto", "suite", "pension", "hospedarme", "hostel"]],
  [
    "turismo",
    "Lugares turísticos",
    ["turismo", "turistico", "turisticos", "visitar", "mirador", "monumento", "malecon", "atraccion", "atracciones", "conocer"],
  ],
  [
    "ejercicio",
    "Dónde hacer ejercicio",
    ["ejercicio", "gimnasio", "gym", "correr", "trotar", "yoga", "pesas", "crossfit", "piscina", "natacion", "cancha", "futbol", "deporte", "deportes", "bicicleta", "fitness", "entrenar"],
  ],
  ["paseos", "Dónde pasear", ["pasear", "paseo", "parque", "caminar", "caminata", "malecones", "plaza", "familia", "relajarme"]],
  [
    "cafes",
    "Cafés y heladerías",
    ["cafe", "cafes", "cafeteria", "cafeterias", "helado", "helados", "heladeria", "heladerias", "postre", "postres", "pastel", "pasteles", "reposteria", "panaderia", "capuchino", "cafecito", "batido", "jugo", "jugos"],
  ],
  [
    "vida-nocturna",
    "Vida nocturna",
    ["bar", "bares", "discoteca", "discotecas", "karaoke", "noche", "nocturna", "rumba", "fiesta", "baile", "bailar", "cerveza", "cocteles", "coctel", "trago", "tragos", "salsoteca", "licor", "pub"],
  ],
  ["museos", "Museos y cultura", ["museo", "museos", "cultura", "cultural", "galeria", "arte", "historia", "teatro", "exposicion", "biblioteca"]],
  [
    "compras",
    "Compras y mercados",
    ["compras", "comprar", "mercado", "mercados", "centro comercial", "mall", "tienda", "tiendas", "ropa", "souvenir", "souvenirs", "artesania", "artesanias", "regalo", "regalos", "supermercado"],
  ],
  ["ninos", "Para niños", ["nino", "ninos", "nina", "ninas", "infantil", "juegos", "cumpleanos", "bebe", "hijos", "familiar"]],
  [
    "naturaleza",
    "Naturaleza y aventura",
    ["naturaleza", "aventura", "senderismo", "manglar", "manglares", "isla", "playa", "playas", "aves", "pajaros", "cascada", "kayak", "camping", "bosque", "ecologico"],
  ],
  [
    "reparaciones",
    "Reparaciones y servicios",
    ["reparar", "reparacion", "reparaciones", "arreglar", "danado", "danada", "celular", "celulares", "computadora", "laptop", "electronica", "taller", "mecanico", "cerrajero", "cerrajeria", "tecnico", "plomero", "electricista", "lavanderia"],
  ],
  ["guias", "Guías turísticos", ["guia", "guias", "tour", "tours", "recorrido", "recorridos", "excursion", "traductor", "guiado"]],
];

/** Distancia de Levenshtein (cuántas letras hay que cambiar para pasar de una palabra a otra). */
function distancia(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2; // solo nos importa saber si es 0 o 1
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return fila[b.length];
}

/** ¿La palabra escrita es esta palabra del diccionario? Exacta, o con un error de escritura si es larga (6 letras o más). */
function coincide(dicha: string, conocida: string): boolean {
  if (dicha === conocida) return true;
  return dicha.length >= 6 && conocida.length >= 6 && distancia(dicha, conocida) <= 1;
}

/**
 * Para un texto buscado («almuerzo», «donde comer ceviche», «encebolado»), devuelve la categoría de la guía donde
 * conviene mirar, o null si ninguna palabra se reconoce. Si hay palabras de varias categorías, gana la que más acierta
 * (y a igualdad, la que aparece primero en el diccionario).
 */
export function sugerirCategoria(q: string): Sugerencia | null {
  const texto = normalizar(q).replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!texto) return null;
  const palabras = texto.split(" ");
  let mejor: { s: Sugerencia; puntos: number } | null = null;
  for (const [categoria, nombre, conocidas] of DICCIONARIO) {
    let puntos = 0;
    for (const conocida of conocidas) {
      // Las frases del diccionario («centro comercial») se buscan en el texto completo; las palabras sueltas, una por una
      if (conocida.includes(" ") ? texto.includes(conocida) : palabras.some((p) => coincide(p, conocida))) puntos += 1;
    }
    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { s: { categoria, nombre }, puntos };
  }
  return mejor?.s ?? null;
}
