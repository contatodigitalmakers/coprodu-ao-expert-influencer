// Dados da apresentação na URL (?d=<base64url(JSON)>), iguais ao encode/decode
// de public/apresentacao/js/params.js. A prévia do gerador usa este formato, e
// os links antigos (do site ppt_influenciadores) podem ser importados por ele.

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  let s = value.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeDeckData(data: Record<string, string>) {
  const filled = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== ""));
  return toBase64Url(JSON.stringify(filled));
}

function decodeDeckData(value: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, item] of Object.entries(parsed)) {
      if (/^[a-z0-9_]{1,32}$/.test(key) && (typeof item === "string" || typeof item === "number")) out[key] = String(item);
    }
    return out;
  } catch {
    return {};
  }
}

// Campos de um link de apresentação: ?d=... e/ou ?chave=valor.
// "12/11/2026" vira "2026-11-12", o formato do campo de data.
export function readDeckLink(link: string): Record<string, string> | null {
  let url: URL;
  try {
    url = new URL(link.trim(), "https://exemplo.invalid");
  } catch {
    return null;
  }
  const out: Record<string, string> = {};
  const encoded = url.searchParams.get("d");
  if (encoded) Object.assign(out, decodeDeckData(encoded));
  url.searchParams.forEach((value, key) => {
    if (key !== "d") out[key] = value;
  });
  for (const key of ["data", "kickoff"]) {
    const match = out[key]?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) out[key] = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  if (out.setup && !out.caucao) out.caucao = out.setup; // nome antigo do campo
  return out;
}
