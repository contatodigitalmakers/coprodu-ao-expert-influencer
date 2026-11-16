/*
 * Digital Makerss · padrões da apresentação
 *
 * Tudo aqui vale para todos os links. Qualquer valor simples pode ser
 * sobrescrito por um parâmetro de mesmo nome na URL (ex.: ?destaque=2).
 * Campos vazios ('') somem da apresentação em vez de mostrar "[__]".
 * Para ver o que está faltando, abra a apresentação com ?rascunho=1
 *
 * Cases, prints e vídeos ficam só aqui (listas). Vazias = o slide some.
 */
window.DM = window.DM || {};

window.DM.config = {
  /* Empresa (slides 1, 22 e rodapés) */
  empresa: 'Digital Makerss',
  vendedor: '',          // seu nome, aparece no fechamento
  whatsapp: '',          // só números, com DDI e DDD. Ex.: 5511999999999
  instagram: '',         // ex.: @digitalmakerss
  mensagem: 'Oi! Vi a apresentação do app e quero seguir para os próximos passos.',

  /* Projeção (calculadora). O % "você" segue o plano em destaque, salvo se a URL mandar outro. */
  conv: 1,               // % da audiência que assina
  preco: 39,             // preço da assinatura por mês, em R$

  /* Oferta. destaque: 0 nenhum, 1 = 60/40 + 4k, 2 = 70/30 + 5k, 3 = 80/20 + 6k */
  voce: 60,
  nos: 40,
  caucao: 4000,          // caução do plano em destaque; alias antigo: setup
  setup: 4000,
  destaque: 1,
  semanas: '',           // semanas do "sim" ao lançamento
  horas: '',             // horas por semana que o expert dedica
  contrato: '',          // em quantos dias o contrato é enviado
  dono: 'O app é seu. Nós temos apenas uma participação nele, mas o app é seu.',

  /* Marco de faturamento (slide da prova). Número em reais. */
  faturamento_2026: 1300000,

  /*
   * Planos fixos do slide de oferta. O primeiro é a sugestão (destaque 1).
   * voce / nos em %, caucao em reais.
   */
  planos: [
    { voce: 60, nos: 40, caucao: 4000 },
    { voce: 70, nos: 30, caucao: 5000 },
    { voce: 80, nos: 20, caucao: 6000 }
  ],

  /*
   * Prova social. Preencha e o slide aparece; deixe [] e ele some.
   * Fotos, prints e vídeos: URL https ou caminho em assets/cases/
   *
   * cases: [
   *   { nome: 'Ana Souza', nicho: 'finanças', foto: 'assets/cases/ana.jpg',
   *     seguidores: 350000, assinantes: 1200, receita: 46800,
   *     frase: 'O app virou a renda que o lançamento não me dava.' }
   * ]
   * prints: [
   *   { src: '/apresentacao/assets/cases/painel.png', legenda: 'Assinantes entrando mês a mês' }
   * ]
   * videos: [
   *   { src: 'https://www.youtube.com/watch?v=XXXXXXXXXXX', titulo: 'Resultado do lançamento' },
   *   { src: '/apresentacao/assets/cases/resultado.mp4', titulo: 'Bastidor', poster: '/apresentacao/assets/cases/poster.jpg', orientacao: 'retrato' }
   * ]
   * orientacao: 'retrato' deixa o vídeo em pé. No slide, o arquivo toca sozinho, em loop.
   */
  cases: [],
  prints: [],
  videos: [
    { src: '/apresentacao/assets/cases/vendas-1.mp4', titulo: 'Vendas entrando', poster: '/apresentacao/assets/cases/vendas-1.jpg', orientacao: 'retrato' },
    { src: '/apresentacao/assets/cases/vendas-2.mp4', titulo: 'Pagamentos confirmados', poster: '/apresentacao/assets/cases/vendas-2.jpg', orientacao: 'retrato' },
    { src: '/apresentacao/assets/cases/vendas-3.mp4', titulo: 'Vendas confirmadas', poster: '/apresentacao/assets/cases/vendas-3.jpg', orientacao: 'retrato' }
  ],

  /* Case único legado (ainda funciona se cases/prints estiverem vazios). */
  case_nome: '',
  case_nicho: '',
  case_seguidores: '',
  case_assinantes: '',
  case_receita: '',
  case_semanas: '',
  case_frase: '',
  case_foto: '',
  case_print1: '',
  case_print2: '',
  case_print3: ''
};
