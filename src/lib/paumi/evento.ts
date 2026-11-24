/*
 * Aviso para abrir a Paumi desde otra parte de la página (versión 14, fase 44.2). Quien lo manda no habla con la IA:
 * solo le pide a Paumi que abra su ventana y deje escrita una pregunta. La persona decide si la envía (así no se
 * gasta nada hasta que toque «Enviar»).
 */
export const EVENTO_PREGUNTAR_PAUMI = "mle:preguntar-paumi";

export type PreguntarPaumi = { texto: string };
