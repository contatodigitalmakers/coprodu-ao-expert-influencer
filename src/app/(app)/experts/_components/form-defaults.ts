import type { ExpertDetail } from "@/lib/experts/queries";

// Valores iniciais do formulário (tudo como texto, como num campo de formulário).
export type ExpertFormDefaults = {
  name: string;
  handle: string;
  platform: string;
  profileUrl: string;
  nicheId: string | null;
  followers: string;
  engagementRate: string;
  whatsapp: string;
  email: string;
  city: string;
  source: string;
  ownerId: string | null;
  tags: string[];
  notes: string;
  sellsProduct: string;
  productDescription: string;
  hasMethod: string;
  recurringProblem: string;
  contentFrequency: string;
};

const yesNo = (value: boolean | null) =>
  value === true ? "sim" : value === false ? "nao" : "nao_informado";

// Sem expert = cadastro novo (responsável padrão: quem está cadastrando).
export function toFormDefaults(expert: ExpertDetail | null, currentUserId: string): ExpertFormDefaults {
  return {
    name: expert?.name ?? "",
    handle: expert?.handle ?? "",
    platform: expert?.platform ?? "instagram",
    profileUrl: expert?.profileUrl ?? "",
    nicheId: expert?.nicheId ?? null,
    followers: expert?.followers?.toString() ?? "",
    engagementRate: expert?.engagementRate?.toString().replace(".", ",") ?? "",
    whatsapp: expert?.whatsapp ?? "",
    email: expert?.email ?? "",
    city: expert?.city ?? "",
    source: expert?.source ?? "",
    ownerId: expert ? expert.ownerId : currentUserId,
    tags: expert?.tags.map((tag) => tag.name) ?? [],
    notes: expert?.notes ?? "",
    sellsProduct: yesNo(expert?.sellsProduct ?? null),
    productDescription: expert?.productDescription ?? "",
    hasMethod: yesNo(expert?.hasMethod ?? null),
    recurringProblem: yesNo(expert?.recurringProblem ?? null),
    contentFrequency: yesNo(expert?.contentFrequency ?? null),
  };
}
