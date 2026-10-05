import { z } from "zod";

export const esquemaDecision = z.object({
  solicitud: z.uuid(),
  nota: z.string().trim().max(1000, "Máximo 1000 caracteres").optional().default(""),
});
