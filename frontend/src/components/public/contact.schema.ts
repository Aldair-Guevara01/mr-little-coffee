import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(100, "Usa como máximo 100 caracteres."),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido.").max(254, "Usa como máximo 254 caracteres."),
  message: z.string().trim().min(10, "Escribe un mensaje de al menos 10 caracteres.").max(3000, "Usa como máximo 3000 caracteres."),
});

export type ContactValues = z.infer<typeof contactSchema>;
