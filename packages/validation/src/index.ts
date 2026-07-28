import { z } from "zod";

export const candidateSchema = z.object({
  nombre_completo: z.string().trim().min(2).max(120),
  apodo_o_titulo: z.string().trim().max(80).nullable().optional(),
  edad: z.number().int().min(14).max(100).nullable().optional(),
  descripcion: z.string().trim().min(10).max(3000),
  representa_a: z.string().trim().min(2).max(160),
  orden: z.number().int().min(0).max(10000),
  activa: z.boolean()
});

export const voteRequestSchema = z.object({
  candidataId: z.string().uuid(),
  codigo: z.string().trim().min(10).max(64),
  turnstileToken: z.string().min(1).max(2048)
});

export const codeBatchSchema = z.object({
  cantidad: z.number().int().min(1).max(1000),
  etiqueta: z.string().trim().max(120).optional().default(""),
  lote: z.string().trim().min(2).max(120)
});

export function normalizeVotingCode(value: string): string {
  return value.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function getVotingPhase(start: string | null, end: string | null, now = new Date()): "closed" | "upcoming" | "open" | "finished" {
  if (!start || !end) return "closed";
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from >= to) return "closed";
  if (now < from) return "upcoming";
  if (now > to) return "finished";
  return "open";
}
