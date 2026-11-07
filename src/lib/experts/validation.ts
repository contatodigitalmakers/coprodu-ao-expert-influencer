import { z } from "zod";
import { platform } from "@/db/schema/enums";
import {
  normalizeHandle,
  normalizeUrl,
  normalizeWhatsapp,
  parseDecimal,
  parseFollowers,
  parseYesNo,
  splitTags,
} from "./normalize";

// Validação dos dados de um expert. As regras dos campos são as mesmas no
// formulário e na importação CSV; só muda como nicho, responsável e tags chegam.

const optionalText = z
  .string()
  .trim()
  .max(5000, "Texto muito longo.")
  .transform((value) => value || null);

const optionalUuid = z
  .string()
  .transform((value) => value || null)
  .pipe(z.uuid().nullable());

const yesNo = z
  .string()
  .transform(parseYesNo)
  .refine((value) => value !== "invalid", "Use sim ou não.")
  .transform((value) => value as boolean | null);

const expertFields = {
  name: z.string().trim().min(1, "Informe o nome.").max(200, "Nome muito longo."),
  handle: z
    .string()
    .transform(normalizeHandle)
    .pipe(z.string().min(1, "Informe o @.").max(100, "@ muito longo.")),
  platform: z.enum(platform.enumValues, "Escolha a plataforma."),
  profileUrl: z.string().transform(normalizeUrl),
  followers: z
    .string()
    .transform(parseFollowers)
    .refine(
      (value) => value === null || (Number.isInteger(value) && value >= 0),
      "Número de seguidores inválido.",
    ),
  engagementRate: z
    .string()
    .transform(parseDecimal)
    .refine(
      (value) => value === null || (value >= 0 && value <= 100),
      "Engajamento deve ser um percentual entre 0 e 100.",
    ),
  whatsapp: z
    .string()
    .transform(normalizeWhatsapp)
    .refine((value) => value !== "invalid", "WhatsApp inválido. Use DDD + número.")
    .transform((value) => value as string | null),
  email: optionalText.pipe(z.email("E-mail inválido.").nullable()),
  city: optionalText,
  source: optionalText,
  notes: optionalText,
  sellsProduct: yesNo,
  productDescription: optionalText,
  hasMethod: yesNo,
  recurringProblem: yesNo,
  contentFrequency: yesNo,
};

// Formulário de cadastro/edição: nicho e responsável vêm como id; tags como nomes.
export const expertFormSchema = z.object({
  ...expertFields,
  nicheId: optionalUuid,
  ownerId: optionalUuid,
  tags: z.array(z.string().trim().min(1).max(50)).max(20, "No máximo 20 tags."),
});

export type ExpertFormData = z.infer<typeof expertFormSchema>;

// Linha da planilha: nicho e tags vêm como texto (criados se não existirem).
export const importRowSchema = z.object({
  ...expertFields,
  niche: optionalText,
  tags: z.string().transform(splitTags),
});

export type ImportRowData = z.infer<typeof importRowSchema>;

// Primeira mensagem de erro de cada campo.
export function firstFieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= issue.message;
  }
  return errors;
}
