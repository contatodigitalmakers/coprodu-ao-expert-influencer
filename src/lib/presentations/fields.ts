// Campos do gerador de apresentação. É uma cópia do FIELDS de
// public/apresentacao/js/params.js, que monta os slides: campo novo ou
// alterado aqui precisa ser alterado lá também.

export type FieldType = "text" | "textarea" | "date" | "num" | "money" | "pct" | "color" | "url" | "tel" | "select";

export type DeckField = {
  group: string;
  key: string;
  label: string;
  type: FieldType;
  example: string;
  help: string;
  slides: string;
};

// [grupo, chave, rótulo, tipo, exemplo, ajuda, slides]
const FIELDS: [string, string, string, FieldType, string, string, string][] = [
  ["Cliente", "expert", "Nome do expert", "text", "Ana Souza", "", "1, 8"],
  ["Cliente", "data", "Data da conversa", "date", "", "Vazio = hoje", "1"],
  ["Cliente", "nicho", "Nicho", "text", "emagrecimento feminino", "", "8, 9"],

  ["Diagnóstico", "seguidores", "Seguidores", "num", "200 mil", "Aceita 200mil, 1,2mi ou 200000", "3, 14"],
  ["Diagnóstico", "rede", "Rede principal", "text", "Instagram", "", "3"],
  ["Diagnóstico", "publico", "Perfil do público", "text", "mulheres de 25 a 40 anos", "", "3"],
  ["Diagnóstico", "vende", "O que vende hoje", "text", "mentoria em grupo", "", "3"],
  ["Diagnóstico", "ticket", "Ticket médio", "money", "997", "", "3"],
  ["Diagnóstico", "acompanha", "Acompanhamento dos alunos", "text", "grupo no WhatsApp", "", "3"],
  ["Diagnóstico", "dor", "O que incomoda", "textarea", "a dor citada na conversa pela DM", "", "3"],
  ["Diagnóstico", "objetivo", "Onde quer chegar", "text", "renda previsível sem depender de lançamento", "", "3"],

  ["App", "app", "Nome do app", "text", "Método Ana", 'Vazio = "Método" + primeiro nome', "1, 8"],
  ["App", "cor", "Cor da marca do expert", "color", "#2bff88", "Usada só dentro do celular", "1, 8"],
  ["App", "foto", "Foto do expert", "url", "https://…", "URL https. Aparece como avatar no celular", "8"],
  ["App", "f1", "Funcionalidade principal do nicho", "text", "Plano alimentar da semana", "", "8"],
  ["App", "f2", "Conteúdo do método", "text", "Método em trilhas de aulas curtas", "", "8"],
  ["App", "f3", "Comunidade ou acompanhamento", "text", "Comunidade com check-in diário", "", "8"],
  ["App", "modulo", "Módulo exclusivo do nicho", "text", "Plano alimentar", "", "9"],
  ["App", "modulo_desc", "O que o módulo faz", "text", "Cardápio ajustado a cada aluna", "", "9"],
  ["App", "mockup", "Print do mockup", "url", "https://…", "URL https. Substitui o celular desenhado", "8"],

  ["Planos", "plano1_voce", "Plano 1: % do expert", "pct", "60", "", "18"],
  ["Planos", "plano1_caucao", "Plano 1: caução", "money", "4000", "", "18"],
  ["Planos", "plano2_voce", "Plano 2: % do expert", "pct", "70", "", "18"],
  ["Planos", "plano2_caucao", "Plano 2: caução", "money", "5000", "", "18"],
  ["Planos", "plano3_voce", "Plano 3: % do expert", "pct", "80", "", "18"],
  ["Planos", "plano3_caucao", "Plano 3: caução", "money", "6000", "", "18"],

  ["Oferta", "destaque", "Plano em destaque", "select", "1", "Card com a borda acesa no slide dos planos", "18"],
  ["Oferta", "voce", "% da receita para o expert", "pct", "60", "Vazio = % do plano em destaque", "16, 18"],
  ["Oferta", "nos", "% da receita para nós", "pct", "40", "Vazio = 100 − % do expert", "18"],
  ["Oferta", "caucao", "Caução do plano em destaque", "money", "4000", "Vazio = caução do plano em destaque", "17, 18"],
  ["Oferta", "semanas", "Semanas até o lançamento", "num", "8", "", "15"],
  ["Oferta", "horas", "Horas por semana do expert", "num", "3", "", "20"],
  ["Oferta", "contrato", "Prazo para enviar o contrato (dias)", "num", "2", "", "21"],
  ["Oferta", "kickoff", "Data sugerida do kickoff", "date", "", "", "21"],

  ["Projeção", "conv", "% da audiência que assina", "pct", "1", "", "16"],
  ["Projeção", "preco", "Preço da assinatura por mês", "money", "39", "", "8, 16"],

  ["Empresa", "empresa", "Nome da empresa", "text", "Digital Makerss", "", "todos"],
  ["Empresa", "vendedor", "Seu nome", "text", "Seu nome", "", "22"],
  ["Empresa", "whatsapp", "WhatsApp", "tel", "5511999999999", "Só números, com DDI e DDD", "22"],
  ["Empresa", "instagram", "@ da empresa", "text", "@digitalmakerss", "", "22"],
  ["Empresa", "mensagem", "Mensagem pronta do WhatsApp", "text", "", "", "22"],
  ["Empresa", "dono", 'Resposta "De quem é o app?"', "textarea", "", "", "20"],

  ["Case", "case_nome", "Expert parceiro", "text", "Nome do parceiro", "Se a lista cases em config.js estiver vazia, este nome abre o slide", "11"],
  ["Case", "case_nicho", "Nicho do parceiro", "text", "finanças", "", "11"],
  ["Case", "case_seguidores", "Seguidores", "num", "350 mil", "", "11"],
  ["Case", "case_assinantes", "Assinantes ativos", "num", "1200", "", "11"],
  ["Case", "case_receita", "Receita por mês", "money", "46800", "", "11"],
  ["Case", "case_semanas", "Semanas até o lançamento", "num", "8", "", "11"],
  ["Case", "case_frase", "Frase do parceiro", "textarea", "", "", "11"],
  ["Case", "case_foto", "Foto do parceiro", "url", "https://…", "Exibida em preto e branco", "11"],
  ["Case", "case_print1", "Print: painel de assinaturas", "url", "https://…", "Se prints em config.js estiver vazio, este abre o slide", "12"],
  ["Case", "case_print2", "Print: feedback de alunos", "url", "https://…", "", "12"],
  ["Case", "case_print3", "Print: tela de progresso", "url", "https://…", "", "12"],
];

export const DECK_FIELDS: DeckField[] = FIELDS.map(([group, key, label, type, example, help, slides]) => ({
  group,
  key,
  label,
  type,
  example,
  help,
  slides,
}));

export const FIELD_KEYS = new Set(DECK_FIELDS.map((field) => field.key));

// Grupos abertos ao abrir o formulário, e notas de cada grupo.
export const OPEN_GROUPS = new Set(["Cliente", "Diagnóstico", "App", "Planos"]);
export const GROUP_NOTES: Record<string, string> = {
  Planos: "Os três cards do slide de planos. Vêm dos planos ativos em Configurações; mude aqui só para esta apresentação.",
  Oferta: "Vazio = valores do plano em destaque.",
  Projeção: "Valores iniciais da calculadora. Vazio = padrão da apresentação.",
  Empresa: "Já vem da configuração da apresentação. Preencha só para trocar nesta.",
  Case: "Um parceiro só. Para vários cases, prints e vídeos, use as listas em public/apresentacao/js/config.js. Sem nada preenchido, esses slides somem.",
};
// Campos que ocupam a linha inteira.
export const WIDE_FIELDS = new Set([
  "publico", "vende", "acompanha", "dor", "objetivo", "foto", "f1", "f2", "f3", "modulo_desc", "mockup",
  "mensagem", "dono", "case_frase", "case_foto", "case_print1", "case_print2", "case_print3",
]);

// Padrões de public/apresentacao/js/config.js, mostrados como "Padrão: …".
export const CONFIG_DEFAULTS: Record<string, string> = {
  empresa: "Digital Makerss",
  mensagem: "Oi! Vi a apresentação do app e quero seguir para os próximos passos.",
  dono: "O app é seu. Nós temos apenas uma participação nele, mas o app é seu.",
  conv: "1%",
  preco: "R$ 39",
};

// Planos de config.js, usados quando o CRM tem menos de 3 planos ativos.
export const DEFAULT_PLANS = [
  { expertShare: 60, setupValue: 4000 },
  { expertShare: 70, setupValue: 5000 },
  { expertShare: 80, setupValue: 6000 },
];

export const SLIDES: [number, string][] = [
  [1, "Capa"], [2, "O que vamos fazer"], [3, "O que você nos contou"], [4, "Jeitos de ganhar"],
  [5, "Por que ter um app"], [6, "A virada"], [7, "Por que um app"], [8, "O app do expert"],
  [9, "O que vai dentro do app"], [10, "Faturamento 2026"], [11, "Parceiros"], [12, "Prints"],
  [13, "Vídeos"], [14, "Como funciona a co-produção"], [15, "Do “sim” ao lançamento"], [16, "Calculadora"],
  [17, "Caução"], [18, "Três planos"], [19, "Tráfego pago"], [20, "Perguntas"],
  [21, "Próximos passos"], [22, "Fechamento"],
];

export const MAX_FIELD_LENGTH = 400; // o mesmo corte do clean() de params.js

// Número em pt-BR, como o parseNum de params.js: 200mil, 1,2mi, R$ 4.000, 1%.
export function parseDeckNumber(input: string) {
  let s = input.toLowerCase().replace(/r\$|%|\s/g, "").replace(/seguidores?|assinantes?/g, "");
  if (!s) return NaN;
  let mult = 1;
  const match = s.match(/^(.*?)(milh(?:ões|oes|ão|ao)|mi|mm|m|mil|k)$/);
  if (match) {
    s = match[1];
    mult = /^(mil|k)$/.test(match[2]) ? 1e3 : 1e6;
  }
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
  return parseFloat(s) * mult;
}

// Mesmas regras do safeUrl de params.js (sem "assets/" relativo).
export function isDeckUrl(value: string) {
  if (/^https:\/\/[^\s"'<>]+$/i.test(value)) return true;
  return /^\/apresentacao\/assets\/[\w\-./]+$/i.test(value) && !value.includes("..");
}

// Erro do campo para o usuário, ou "" se o valor é válido (vazio é sempre válido).
export function fieldError(field: DeckField, value: string) {
  if (!value) return "";
  if (value.length > MAX_FIELD_LENGTH) return `No máximo ${MAX_FIELD_LENGTH} caracteres.`;
  if (field.type === "num" || field.type === "money" || field.type === "pct") {
    const number = parseDeckNumber(value);
    if (!Number.isFinite(number)) return `Use só números. Ex.: ${field.example || "10"}`;
    if (field.type === "pct" && (number < 0 || number > 100)) return "Use um valor de 0 a 100.";
    if (number < 0) return "Use um valor positivo.";
  }
  if (field.type === "url" && !isDeckUrl(value)) return "Use um link https://";
  if (field.type === "color" && !/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return "Use uma cor em hex, ex.: #2bff88";
  if (field.type === "tel" && value.replace(/\D/g, "").length < 10) return "Só números, com DDI e DDD";
  if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Use uma data válida.";
  if (field.type === "select" && !/^[0-3]$/.test(value)) return "Escolha uma opção da lista.";
  return "";
}

// "1,3,10" → [1, 3, 10]: os slides ocultos.
export function parseHiddenSlides(value: string | undefined) {
  return (value ?? "")
    .split(/[\s,;]+/)
    .map(Number)
    .filter((n) => SLIDES.some(([slide]) => slide === n));
}
