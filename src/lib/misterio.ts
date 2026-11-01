/*
 * "Guayaquil de misterio" (versión 13, fase 43). Leyendas conocidas de la ciudad, cada una con su fuente y un lugar
 * real que se puede visitar de forma segura, y los recorridos oficiales que se pudieron confirmar.
 * Los textos están escritos con nuestras palabras (no copiados). Regla: nunca invitar a entrar a lugares abandonados,
 * cerrados o privados; solo se cuenta su historia.
 * Revisado el 2026-10-31. Para agregar una leyenda: que tenga fuente (prensa, libro o institución) y lugar visitable.
 */

export type Fuente = { medio: string; titulo: string; url: string; fecha: string };

export type Leyenda = {
  id: string;
  titulo: string;
  /** Dos o tres frases, contadas por nosotros. */
  historia: string;
  /** Dónde se ubica la historia. */
  lugar: string;
  /** Palabras para encontrar el lugar en la Guía útil (si está publicado, se enlaza su página). */
  buscarSitio?: string;
  /** Un dato que aclara qué es historia y qué es leyenda. */
  nota?: string;
  fuente: Fuente;
};

const EXPRESO_2026: Fuente = {
  medio: "Expreso",
  titulo: "El origen de la dama tapada y otras leyendas guayaquileñas",
  url: "https://www.expreso.ec/guayaquil/origen-dama-tapada-leyendas-guayaquilenas-deberias-conocer-288719.html",
  fecha: "9 de julio de 2026",
};

export const LEYENDAS: Leyenda[] = [
  {
    id: "dama-tapada",
    titulo: "La dama tapada",
    historia:
      "Cuentan que en las noches del Guayaquil antiguo una mujer vestida de negro, siempre de espaldas, se dejaba seguir por los hombres que volvían tarde y con tragos. Cuando por fin se daba la vuelta, en lugar de rostro tenía una calavera.",
    lugar: "La calle Panamá, entre la Ciudad Vieja y la Ciudad Nueva, por donde estaba el antiguo puente de las 800 varas.",
    fuente: EXPRESO_2026,
  },
  {
    id: "victor-emilio-estrada",
    titulo: "El banquero que salió del cementerio",
    historia:
      "La historia más contada de la ciudad: el banquero Víctor Emilio Estrada, ya fallecido, habría tomado un taxi a la salida del Cementerio General hasta el edificio de La Previsora, y hasta habría firmado un cheque.",
    lugar: "El Cementerio General y el edificio de La Previsora, en 9 de Octubre y Pichincha.",
    buscarSitio: "cementerio general",
    nota: "No se debe confundir con el expresidente Emilio Estrada.",
    fuente: EXPRESO_2026,
  },
  {
    id: "cruz-santa-ana",
    titulo: "El tesoro del cerro y la cruz de Santa Ana",
    historia:
      "Un explorador español encontró en una cueva del cerro un tesoro cuidado por una princesa indígena, que le pidió elegir entre las riquezas y ella. Eligió el oro, la montaña empezó a temblar y, al invocar a Santa Ana, logró escapar. En agradecimiento plantó una cruz en la cima.",
    lugar: "El Cerro Santa Ana, donde se fundó la ciudad. Se sube por sus 444 escalones.",
    buscarSitio: "santa ana",
    fuente: EXPRESO_2026,
  },
  {
    id: "naranjo-encantado",
    titulo: "El naranjo encantado",
    historia:
      "Dicen que en los callejones del cerro había un naranjo de frutas sin semillas, y que quien se llevaba una ya no encontraba el camino de regreso.",
    lugar: "Los callejones del Cerro Santa Ana, junto a la iglesia de Santo Domingo, en sus faldas.",
    buscarSitio: "santo domingo",
    nota: "La leyenda se la atribuye a San Martín de Porres, pero los registros históricos dicen que él nunca salió del Perú.",
    fuente: EXPRESO_2026,
  },
  {
    id: "guayas-y-quil",
    titulo: "Guayas y Quil",
    historia:
      "La leyenda que explica el nombre de la ciudad: el cacique Guayas y su esposa Quil prefirieron quitarse la vida antes que rendirse ante los conquistadores españoles.",
    lugar: "Su monumento está en la avenida Pedro Menéndez Gilbert, al inicio del puente de la Unidad Nacional. La leyenda ubica la historia en el antiguo Cerrito Verde, hoy Cerro Santa Ana.",
    fuente: {
      medio: "El Universo",
      titulo: "Las leyendas más populares del folclore de Guayaquil",
      url: "https://www.eluniverso.com/guayaquil/comunidad/las-leyendas-mas-populares-del-folclore-de-guayaquil-nota",
      fecha: "12 de julio de 2023",
    },
  },
];

export type RecorridoOficial = {
  titulo: string;
  quien: string;
  detalle: string;
  /** Dónde se anuncian las fechas (página oficial). */
  contacto: { texto: string; url: string };
  buscarSitio?: string;
  fuente: Fuente;
};

/** Solo los que se confirmaron con una fuente reciente. Nocturnos oficiales: ninguno confirmado al 2026-10-31. */
export const RECORRIDOS_OFICIALES: RecorridoOficial[] = [
  {
    titulo: "Recorridos guiados por el Cementerio General",
    quien: "Dirección de Patrimonio Cultural del Municipio de Guayaquil",
    detalle:
      "Visitas guiadas para conocer las tumbas y mausoleos patrimoniales, como «El beso del ángel» y las tumbas de Olmedo, Rocafuerte, Medardo Ángel Silva y Julio Jaramillo. Las fechas, horarios y condiciones se anuncian en sus redes.",
    contacto: { texto: "@gyecultura en Instagram", url: "https://www.instagram.com/gyecultura/" },
    buscarSitio: "cementerio general",
    fuente: {
      medio: "Primicias",
      titulo: "El Cementerio Patrimonial, una «cuna de saberes» que guarda más de dos siglos de historia de Guayaquil",
      url: "https://www.primicias.ec/guayaquil/cementerio-patrimonial-cuna-saberes-siglos-historia-guayaquil-128261/",
      fecha: "20 de julio de 2026",
    },
  },
];
