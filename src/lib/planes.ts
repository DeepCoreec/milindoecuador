/** Días que da cada compra del plan Destacado (docs/PLAN.md: 1 $ por 7 días; 6 semanas por 5 $). */
export const DIAS_DESTACADO = { semana: 7, seisSemanas: 42 } as const;

/**
 * Nuevo vencimiento del Destacado. Si todavía está vigente, los días se suman al final
 * (quien renueva antes no pierde días); si ya venció o no tenía, cuentan desde ahora.
 */
export function nuevoVencimiento(actual: string | null, dias: number, ahora = new Date()): Date {
  const fin = actual ? new Date(actual) : null;
  const desde = fin && fin.getTime() > ahora.getTime() ? fin : ahora;
  return new Date(desde.getTime() + dias * 24 * 60 * 60 * 1000);
}

/** ¿El destacado sigue vigente? (sin fecha de fin, vale hasta que se quite). */
export function destacadoVigente(activo: boolean, hasta: string | null, ahora = Date.now()): boolean {
  return activo && (!hasta || new Date(hasta).getTime() > ahora);
}
