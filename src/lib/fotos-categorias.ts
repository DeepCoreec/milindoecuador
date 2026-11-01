/*
 * Fotos reales para los cuadros de las categorías (pedido del usuario, 2026-11-01: "ponerle a los íconos alguna imagen
 * real para que se vea más profesional"). Todas de Unsplash, "uso gratuito bajo la Licencia Unsplash" (comprobado en
 * la página de cada foto). Sin foto, se usa el afiche ilustrado de siempre (por ejemplo, "Todas").
 * Para cambiar una: su dirección de images.unsplash.com (sin "?…") aquí y en FOTOS_UNSPLASH de next.config.ts.
 */

export type FotoCategoria = { src: string; autor: string; pagina: string };

const U = "https://images.unsplash.com/";
const P = "https://unsplash.com/es/fotos/";

export const FOTOS_CATEGORIAS: Record<string, FotoCategoria> = {
  restaurantes: { src: `${U}photo-1584208632869-05fa2b2a5934`, autor: "Roberto Carlos Román Don", pagina: `${P}arroz-blanco-en-bol-de-ceramica-integral-TS_g_856-CA` },
  hoteles: { src: `${U}photo-1566665797739-1674de7a421a`, autor: "mark champs", pagina: `${P}dormitorio-moderno-con-cabecero-azul-Id2IIl1jOB0` },
  turismo: { src: `${U}photo-1628004550522-02dc9cb7456e`, autor: "Andres Medina", pagina: `${P}vista-aerea-de-los-edificios-de-la-ciudad-durante-el-dia-3CJGKH0sJfU` },
  ejercicio: { src: `${U}photo-1739368732843-800f36a9b7d0`, autor: "Joshua Tsu", pagina: `${P}un-grupo-de-personas-corriendo-por-una-calle-junto-a-un-rio-k27fjLXCuuo` },
  paseos: { src: `${U}photo-1657249538847-1d91852580e9`, autor: "Jonathan Monck-Mason", pagina: `${P}gente-caminando-cerca-de-tiendas-de-campana-2SE6wCzQjaw` },
  cafes: { src: `${U}photo-1495474472287-4d71bcdd2085`, autor: "Nathan Dumlao", pagina: `${P}tres-personas-sosteniendo-vasos-de-bebidas-6VhPY27jdps` },
  "vida-nocturna": { src: `${U}photo-1572116469696-31de0f17cc34`, autor: "qui nguyen", pagina: `${P}bombillas-sobre-el-area-del-bar-S6atLH5Rf0U` },
  museos: { src: `${U}photo-1761617582647-5f9b510120b2`, autor: "Claire", pagina: `${P}personas-viendo-armaduras-y-armas-historicas-en-un-museo-ICi0Lqknk5Q` },
  compras: { src: `${U}photo-1653414566918-004e6eef8ee6`, autor: "Jonathan Monck-Mason", pagina: `${P}un-grupo-de-personas-de-pie-frente-a-un-mercado-hkW5hlTRESI` },
  ninos: { src: `${U}photo-1575783970733-1aaedde1db74`, autor: "Power Lai", pagina: `${P}multicolored-playground-slide-during-daytime-E0BmfKjeQrw` },
  naturaleza: { src: `${U}photo-1612103183244-7598b792bb05`, autor: "Vishwasa Navada K", pagina: `${P}arboles-verdes-junto-al-rio-durante-el-dia-EK9u6IyUldw` },
  reparaciones: { src: `${U}photo-1639776738932-956082f0b704`, autor: "Vitalijus", pagina: `${P}una-persona-con-guantes-azules-sosteniendo-un-telefono-celular-y2QUqmEzjzA` },
  guias: { src: `${U}photo-1600714480856-dc99b28892eb`, autor: "Bernie Almanzar", pagina: `${P}personas-que-caminan-por-la-calle-durante-el-dia-CUzEBQz4ThE` },
};
