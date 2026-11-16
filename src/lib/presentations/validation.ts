import { z } from "zod";
import { DECK_FIELDS, fieldError, parseHiddenSlides } from "./fields";

// Remove caracteres de controle (mantém quebras de linha), como o clean() de params.js.
const text = z
  .string()
  .transform((value) => value.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim())
  .optional();

// Só as chaves conhecidas entram; as outras são descartadas.
const shape = Object.fromEntries([...DECK_FIELDS.map((field) => [field.key, text]), ["ocultar", text]]);

export const presentationDataSchema = z
  .object(shape)
  .superRefine((data, ctx) => {
    for (const field of DECK_FIELDS) {
      const message = fieldError(field, (data[field.key] as string | undefined) ?? "");
      if (message) ctx.addIssue({ code: "custom", path: [field.key], message: `${field.label}: ${message}` });
    }
  })
  .transform((data) => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string" && value !== "" && key !== "ocultar") out[key] = value;
    }
    const hidden = parseHiddenSlides(data.ocultar as string | undefined);
    if (hidden.length) out.ocultar = [...new Set(hidden)].sort((a, b) => a - b).join(",");
    return out;
  });

export type PresentationData = z.output<typeof presentationDataSchema>;
