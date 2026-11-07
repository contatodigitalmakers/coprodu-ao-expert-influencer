import { formatFollowers } from "@/lib/format";

// Variáveis dos templates (seção 3.6) e como cada uma é preenchida.

export type TemplateData = {
  name: string;
  niche: string | null;
  handle: string;
  followers: number | null;
  sdrName: string;
};

export const TEMPLATE_VARIABLES = [
  { token: "{nome}", label: "Nome do expert", value: (data: TemplateData) => data.name },
  { token: "{nicho}", label: "Nicho", value: (data: TemplateData) => data.niche },
  { token: "{@}", label: "@ do expert", value: (data: TemplateData) => `@${data.handle}` },
  {
    token: "{seguidores}",
    label: "Seguidores",
    // Espaço comum no lugar do espaço não separável do formatador ("48 mil").
    value: (data: TemplateData) =>
      data.followers === null ? null : formatFollowers(data.followers).replace(/\u00a0/g, " "),
  },
  { token: "{nome_sdr}", label: "Seu nome", value: (data: TemplateData) => data.sdrName },
] as const;

const KNOWN_TOKENS = new Set<string>(TEMPLATE_VARIABLES.map((variable) => variable.token));

// Variáveis usadas no texto que o sistema não conhece (ex.: erro de digitação).
export function unknownVariables(body: string) {
  return [...new Set(body.match(/\{[^{}\s]*\}/g) ?? [])].filter((token) => !KNOWN_TOKENS.has(token));
}

// Preenche as variáveis. Dado que falta (ex.: lead sem nicho) vira texto vazio
// e aparece em "missing", para a tela avisar antes do envio.
export function renderTemplate(body: string, data: TemplateData) {
  const missing: string[] = [];
  let text = body;
  for (const variable of TEMPLATE_VARIABLES) {
    if (!text.includes(variable.token)) continue;
    const value = variable.value(data);
    if (!value) missing.push(variable.label);
    text = text.split(variable.token).join(value ?? "");
  }
  return { text, missing };
}

// Dados de exemplo para a prévia do template.
export const SAMPLE_TEMPLATE_DATA: Omit<TemplateData, "sdrName"> = {
  name: "Maria",
  niche: "Nutrição",
  handle: "maria.exemplo",
  followers: 125000,
};

// "Assunto: ..." na primeira linha de um template de e-mail vira o assunto.
export function splitEmailSubject(text: string) {
  const match = text.match(/^Assunto:\s*(.*)\n+/i);
  return match ? { subject: match[1].trim(), body: text.slice(match[0].length) } : { subject: "", body: text };
}
