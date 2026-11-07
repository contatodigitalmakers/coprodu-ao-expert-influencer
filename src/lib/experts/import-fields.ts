// Campos que podem ser importados por CSV. "aliases" são nomes de coluna
// reconhecidos automaticamente no mapeamento (sem acentos, espaços ou símbolos).

export const IMPORT_FIELDS = [
  { key: "name", label: "Nome", required: true, aliases: ["nome", "name", "expert", "nomecompleto"] },
  { key: "handle", label: "@ principal", required: true, aliases: ["@", "arroba", "handle", "usuario", "username", "user", "perfil"] },
  { key: "platform", label: "Plataforma", aliases: ["plataforma", "platform", "rede", "redesocial"] },
  { key: "profileUrl", label: "Link do perfil", aliases: ["linkdoperfil", "link", "url", "linkperfil", "profileurl"] },
  { key: "niche", label: "Nicho", aliases: ["nicho", "niche", "segmento", "area"] },
  { key: "followers", label: "Seguidores", aliases: ["seguidores", "followers", "inscritos", "seguidor"] },
  { key: "engagementRate", label: "Engajamento (%)", aliases: ["engajamento", "taxadeengajamento", "engagement", "engajamentoestimado"] },
  { key: "whatsapp", label: "WhatsApp", aliases: ["whatsapp", "whats", "zap", "telefone", "celular", "fone"] },
  { key: "email", label: "E-mail", aliases: ["email", "mail"] },
  { key: "city", label: "Cidade", aliases: ["cidade", "city", "local"] },
  { key: "source", label: "Origem do lead", aliases: ["origem", "origemdolead", "source", "fonte", "canal"] },
  { key: "tags", label: "Tags", aliases: ["tags", "tag", "etiquetas"] },
  { key: "notes", label: "Observações", aliases: ["observacoes", "observacao", "obs", "notas", "notes"] },
  { key: "sellsProduct", label: "Já vende produto digital?", aliases: ["vendeproduto", "javendeproduto", "vendeprodutodigital", "javendeprodutodigital"] },
  { key: "productDescription", label: "Qual produto", aliases: ["qualproduto", "produto", "produtos"] },
  { key: "hasMethod", label: "Tem método estruturado?", aliases: ["temmetodo", "metodo", "temmetodoestruturado", "metodoestruturado"] },
  { key: "recurringProblem", label: "Problema é recorrente?", aliases: ["problemarecorrente", "problemaerecorrente", "recorrente"] },
  { key: "contentFrequency", label: "Produz conteúdo com frequência?", aliases: ["frequenciadeconteudo", "frequencia", "produzconteudo", "produzconteudocomfrequencia"] },
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number]["key"];

// Uma linha da planilha já mapeada para os campos do sistema.
export type ImportRow = Partial<Record<ImportField, string>>;

export const IMPORT_MAX_ROWS = 1000;

// Nome de coluna comparável com os aliases: "Link do Perfil" → "linkdoperfil".
export function normalizeHeader(header: string) {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@]/g, "");
}
