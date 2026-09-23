import fs from 'fs';

/*
 * Reforma Tributária e o Simples Nacional — versão corrigida e ampliada.
 *
 * Base: o JSON original do Lucas (5 módulos). O que mudou:
 *   - 4 breakdown-charts viraram tabelas: as partes somavam 2x o total e o
 *     gráfico saía sem sentido (ele reparte um todo, não lista linhas);
 *   - 2 erros de aritmética na margem líquida (indústria e serviços);
 *   - shortTitle do módulo 2 passava de 22 caracteres e truncava no celular;
 *   - tone nos callouts, leadCapture, quiz por módulo, calculadoras;
 *   - 4 módulos novos: a CBS por dentro, reduções de alíquota, quando a
 *     redução vira a conta, e o diagnóstico final.
 *
 * TODOS OS PERCENTUAIS AQUI SÃO DE ESTUDO. A alíquota da CBS depende de
 * resolução do Senado. Trocar as constantes abaixo atualiza o curso inteiro.
 */

const CBS_REF = 9.21;   // estimativa da Resolução CGIBS nº 14/2026
const IBS_REF = 18.70;
const REF_TOTAL = CBS_REF + IBS_REF;

/** Quanto do valor do DAS é PIS + COFINS, pelas tabelas de partilha. */
const SHARE = { I: 0.155, II: 0.14, III: 0.156 };

/** Reduções de alíquota da LC 214/2025, como fração de desconto. */
const RED_60 = 0.6;
const RED_30 = 0.3;

const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pctS = (n, casas = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';

/** Alíquota de saída depois da redução setorial. */
const reduzida = (desconto) => CBS_REF * (1 - desconto);

/**
 * Compras com nota (em % da receita) que fazem os dois modelos empatarem.
 * O crédito entra pela alíquota cheia, porque quem vende para você costuma
 * estar no regime normal; a saída entra pela sua alíquota, já reduzida.
 */
const equilibrio = (das, share, receita, aliqSaida = CBS_REF) =>
  ((aliqSaida / 100 - (das * share) / receita) / (CBS_REF / 100)) * 100;

/* ---------------------------------------------------------------- */
/* Números dos exemplos                                              */
/* ---------------------------------------------------------------- */

// Módulo 3 — empresa genérica do Anexo I
const G = { rec: 50000, aliq: 0.06 };
G.das = G.rec * G.aliq;
G.fatia = G.das * SHARE.I;
G.dasReduzido = G.das - G.fatia;
G.compras = 25000;
G.cbsBruta = G.rec * (CBS_REF / 100);
G.credito = G.compras * (CBS_REF / 100);
G.cbsLiquida = G.cbsBruta - G.credito;
G.modelo2 = G.dasReduzido + G.cbsLiquida;

// Módulo 6 — loja de materiais de construção
const L = { rec: 40000, aliq: 0.08, custo: 22000, desp: 8800 };
L.das = L.rec * L.aliq;
L.fatia = L.das * SHARE.I;
L.dasReduzido = L.das - L.fatia;
L.cbsBruta = L.rec * (CBS_REF / 100);
L.credito = L.custo * (CBS_REF / 100);
L.cbsLiquida = L.cbsBruta - L.credito;
L.modelo2 = L.dasReduzido + L.cbsLiquida;
L.margem = L.rec - L.custo - L.cbsLiquida - L.dasReduzido - L.desp;
L.equilibrio = equilibrio(L.das, SHARE.I, L.rec);

// Módulo 6 — distribuidora
const D = { rec: 100000, aliq: 0.08, custo: 90000 };
D.das = D.rec * D.aliq;
D.dasReduzido = D.das * (1 - SHARE.I);
D.cbsBruta = D.rec * (CBS_REF / 100);
D.credito = D.custo * (CBS_REF / 100);
D.cbsLiquida = D.cbsBruta - D.credito;
D.modelo2 = D.dasReduzido + D.cbsLiquida;

// Módulo 7 — indústria de móveis
const I = { rec: 60000, aliq: 0.085, custo: 33000, desp: 12000 };
I.das = I.rec * I.aliq;
I.fatia = I.das * SHARE.II;
I.dasReduzido = I.das - I.fatia;
I.cbsBruta = I.rec * (CBS_REF / 100);
I.credito = I.custo * (CBS_REF / 100);
I.cbsLiquida = I.cbsBruta - I.credito;
I.modelo2 = I.dasReduzido + I.cbsLiquida;
I.margem = I.rec - I.custo - I.cbsLiquida - I.dasReduzido - I.desp;
I.equilibrio = equilibrio(I.das, SHARE.II, I.rec);

// Módulo 8 — escritório de contabilidade
const S = { rec: 35000, aliq: 0.07, insumos: 4000, desp: 15000 };
S.das = S.rec * S.aliq;
S.fatia = S.das * SHARE.III;
S.dasReduzido = S.das - S.fatia;
S.cbsBruta = S.rec * (CBS_REF / 100);
S.credito = S.insumos * (CBS_REF / 100);
S.cbsLiquida = S.cbsBruta - S.credito;
S.modelo2 = S.dasReduzido + S.cbsLiquida;
S.margem = S.rec - S.cbsLiquida - S.dasReduzido - S.desp;
S.equilibrio = equilibrio(S.das, SHARE.III, S.rec);

// O mesmo escritório, agora com a redução de 30% da profissão regulamentada
S.aliqRed = reduzida(RED_30);
S.cbsBrutaRed = S.rec * (S.aliqRed / 100);
S.cbsLiquidaRed = S.cbsBrutaRed - S.credito;
S.modelo2Red = S.dasReduzido + S.cbsLiquidaRed;
S.equilibrioRed = equilibrio(S.das, SHARE.III, S.rec, S.aliqRed);

// Uma clínica do Anexo III, com a redução de 60% da saúde
const C = { rec: 35000, aliq: 0.07, insumos: 6000 };
C.das = C.rec * C.aliq;
C.fatia = C.das * SHARE.III;
C.dasReduzido = C.das - C.fatia;
C.aliqRed = reduzida(RED_60);
C.cbsBruta = C.rec * (C.aliqRed / 100);
C.credito = C.insumos * (CBS_REF / 100);
C.cbsLiquida = Math.max(0, C.cbsBruta - C.credito);
C.modelo2 = C.dasReduzido + C.cbsLiquida;
C.equilibrio = equilibrio(C.das, SHARE.III, C.rec, C.aliqRed);

/* ---------------------------------------------------------------- */

const AVISO_9_21 = {
  type: 'callout',
  tone: 'warning',
  title: `O NÚMERO ${pctS(CBS_REF)} É DE ESTUDO, NÃO É A ALÍQUOTA OFICIAL`,
  items: [
    `Ele saiu da Resolução CGIBS nº 14/2026, que usou ${pctS(REF_TOTAL)} (${pctS(IBS_REF)} de IBS mais ${pctS(CBS_REF)} de CBS) só para calcular o orçamento do próprio Comitê`,
    'A alíquota real depende de cálculo da Receita, homologação do TCU e resolução do Senado',
    'Use como referência para dimensionar a decisão, nunca como valor confirmado',
    'Todas as simulações deste curso refazem a conta sozinhas se o número mudar',
  ],
};

const modules = [
  /* ------------------------------------------------------------- 1 */
  {
    id: 'panorama-reforma',
    shortTitle: 'Panorama do Simples',
    kicker: 'MÓDULO 01 · CONTEXTO',
    title: 'Reforma Tributária e o Simples Nacional: o que muda com a CBS',
    summary:
      'O cronograma oficial da Reforma para quem está no Simples, com foco na CBS, que substitui o PIS e a COFINS a partir de 2027.',
    content: [
      {
        type: 'paragraph',
        text: 'A Reforma Tributária substitui diversos tributos sobre o consumo por dois novos: a CBS, federal, e o IBS, de estados e municípios. Para as empresas do Simples Nacional, a transição segue um cronograma próprio, com regras específicas de adaptação — e uma decisão a tomar antes de 2027.',
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'DO QUE ESTE CURSO TRATA',
        items: [
          'Só do Simples Nacional. Lucro Real e Lucro Presumido seguem cronograma e regras diferentes.',
          'Só da CBS. O IBS entra depois e tem regras próprias.',
          'Nenhuma alíquota aqui é definitiva: a Reforma ainda está em regulamentação.',
          'Os números são ilustrativos e simplificados. Valide com o seu contador antes de decidir.',
        ],
      },
      { type: 'heading', text: 'Linha do tempo do Simples Nacional' },
      {
        type: 'timeline',
        items: [
          {
            year: '2026 (ano todo)',
            text: `Fase de teste. O DAS continua calculado como hoje. Já aparecem alíquotas experimentais de CBS (${pctS(0.9, 1)}) e IBS (${pctS(0.1, 1)}) nas notas, só para calibrar os sistemas — não são cobrança real.`,
          },
          {
            year: 'Set/2026',
            text: 'Janela de opção: entre 1º e 30 de setembro a empresa decide se recolhe a CBS dentro do DAS (modelo unificado) ou separadamente (regime regular).',
          },
          {
            year: 'Até 30/nov/2026',
            text: 'Prazo de arrependimento: quem optou pelo regime regular pode desistir e voltar ao modelo unificado, sem custo.',
          },
          {
            year: 'Jan/2027',
            text: 'A opção feita em setembro entra em vigor. As notas do Simples passam a destacar a CBS de fato pela primeira vez.',
          },
          {
            year: 'Mar/2027',
            text: 'Nova janela de decisão, para escolher o regime de recolhimento do segundo semestre de 2027.',
          },
          {
            year: '2027 a 2032',
            text: 'Transição: convivência entre o sistema antigo e o novo, com redução gradual das alíquotas antigas.',
          },
          {
            year: '2033',
            text: 'Modelo novo em vigor por inteiro. Extinção definitiva do PIS, da COFINS e dos demais tributos substituídos.',
          },
        ],
      },
      {
        type: 'callout',
        tone: 'danger',
        title: 'A REGRA QUE DECIDE TUDO',
        items: [
          'A escolha feita em setembro de 2026 vale só para janeiro a junho de 2027',
          'Dá para desistir do regime regular até 30 de novembro de 2026, sem penalidade',
          'Quem não optar por nada continua automaticamente com a CBS dentro do DAS',
          'Não decidir é uma decisão: é ficar no modelo unificado',
        ],
      },
      {
        type: 'highlight',
        text: 'Setembro de 2026 é o mês da decisão. Novembro é o mês da segunda chance. Depois disso, só em março de 2027.',
      },
      {
        type: 'quiz',
        question: 'A empresa não fez nada em setembro de 2026. O que acontece em janeiro de 2027?',
        options: [
          'Ela é excluída do Simples Nacional',
          'Ela continua com a CBS dentro do DAS, no modelo unificado',
          'Ela passa automaticamente para o regime regular',
        ],
        correct: 1,
        explanation:
          'O modelo unificado é o padrão: quem não se manifesta permanece nele. Para sair do DAS é preciso ato de vontade dentro da janela. Isso é uma boa notícia para a maioria — como os módulos seguintes mostram, o unificado costuma ser o mais barato.',
      },
    ],
  },

  /* ------------------------------------------------------------- 2 */
  {
    id: 'cbs-por-dentro',
    shortTitle: 'A CBS por dentro',
    kicker: 'MÓDULO 02 · O TRIBUTO',
    title: 'A CBS por dentro: como ela é apurada',
    summary:
      'Antes de escolher entre os dois modelos, vale entender como a CBS funciona. É ela que muda tudo na conta do regime regular.',
    content: [
      {
        type: 'paragraph',
        text: 'A CBS é a Contribuição sobre Bens e Serviços. Ela substitui o PIS e a COFINS e é federal. O nome técnico do desenho dela é IVA: imposto sobre valor agregado. A diferença para o PIS/COFINS de hoje não está na sigla, está no crédito.',
      },
      { type: 'heading', text: 'A conta da CBS, em uma linha' },
      { type: 'math', expression: 'CBS\\ a\\ pagar = (Al\\acute{i}quota \\times Receita) - Cr\\acute{e}ditos\\ das\\ compras' },
      {
        type: 'paragraph',
        text: 'Você paga sobre tudo o que vende e desconta tudo o que já foi pago de CBS no que você comprou. O resultado é que o tributo incide só sobre o valor que a sua empresa agregou. Quanto mais você compra com nota, menos sobra para pagar.',
      },
      {
        type: 'comparison',
        columns: [
          {
            label: 'Gera crédito de CBS',
            tone: 'positive',
            items: [
              'Mercadoria e insumo comprados de empresa do regime regular, com nota',
              'Frete contratado de transportadora com nota',
              'Energia, água, internet e telefone da empresa, com nota',
              'Aluguel com nota fiscal emitida por PJ',
              'Software, licença e serviço técnico com nota',
            ],
          },
          {
            label: 'Não gera crédito',
            tone: 'negative',
            items: [
              'Folha de pagamento — o maior custo de quem presta serviço',
              'Compra de pessoa física, sem nota',
              'Aluguel pago a pessoa física sem documento fiscal',
              'Compra de fornecedor do Simples no modelo unificado (crédito quase nulo)',
              'Bem de uso pessoal do sócio',
            ],
          },
        ],
      },
      {
        type: 'callout',
        tone: 'danger',
        title: 'A FOLHA É O DIVISOR DE ÁGUAS',
        items: [
          'Salário, pró-labore e encargos não geram nenhum crédito de CBS',
          'Quem tem a folha como principal custo fica sem o que abater',
          'Por isso contabilidade, consultoria, educação e saúde são os setores que mais sofrem no regime regular',
          'E por isso comércio e indústria, que compram muito com nota, sofrem menos',
        ],
      },
      { type: 'heading', text: 'Duas mudanças operacionais que vêm junto' },
      {
        type: 'steps',
        items: [
          {
            title: 'O imposto vai destacado na nota',
            text: 'O valor da CBS aparece separado do preço, como já acontece com o IPI. O cliente vê exatamente quanto de tributo está pagando — e quanto de crédito vai tomar.',
          },
          {
            title: 'O recolhimento tende a ser no momento do pagamento',
            text: 'É o split payment: o sistema separa a parte do tributo na própria liquidação financeira da venda. Quem vende deixa de receber o valor cheio para recolher depois.',
          },
        ],
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'O QUE ISSO MUDA NO SEU CAIXA',
        items: [
          'Hoje você recebe a venda inteira e paga o DAS no dia 20 do mês seguinte',
          'Com o split payment, a parcela do tributo não passa pelo seu caixa',
          'Quem se acostumou a usar o dinheiro do imposto como capital de giro perde esse fôlego',
          'Isso vale para quem está no regime regular; no modelo unificado o DAS continua como é hoje',
        ],
      },
      {
        type: 'quiz',
        question: 'Um escritório com R$ 30.000 de receita e R$ 20.000 de folha tem quanto de crédito de CBS sobre a folha?',
        options: [
          'Crédito integral sobre os R$ 20.000',
          'Nenhum — folha de pagamento não gera crédito de CBS',
          'Metade, porque parte é encargo',
        ],
        correct: 1,
        explanation:
          'Salário não é uma compra de bem ou serviço tributada pela CBS, então não há imposto anterior para creditar. É a razão aritmética de quem vive de mão de obra ser o mais penalizado no regime regular — e o módulo de serviços mostra o tamanho disso.',
      },
    ],
  },

  /* ------------------------------------------------------------- 3 */
  {
    id: 'hibrido-vs-regular',
    shortTitle: 'No DAS ou fora',
    kicker: 'MÓDULO 03 · DECISÃO ESTRATÉGICA',
    title: 'CBS no DAS ou fora do DAS: como escolher',
    summary:
      'As duas formas de recolher a CBS no Simples, o que muda na guia em cada uma, e por que a conta raramente é tão simples quanto parece.',
    content: [
      AVISO_9_21,
      {
        type: 'paragraph',
        text: 'No Simples Nacional existem duas formas de recolher a CBS: dentro do DAS, no modelo unificado, ou separadamente, no regime regular. A diferença não é só quanto imposto a empresa paga — é como a guia muda e quanto crédito a empresa consegue repassar ao cliente PJ.',
      },
      { type: 'heading', text: 'Modelo 1 — CBS dentro do DAS' },
      {
        type: 'paragraph',
        text: 'A empresa mantém tudo na guia única. A partir de 2027 a CBS substitui o PIS e a COFINS dentro da própria composição do DAS, mas a carga total não muda: a alíquota efetiva é recalculada para manter o valor. Só troca o nome do tributo por dentro.',
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'QUANTO DO DAS JÁ É PIS + COFINS HOJE',
        items: [
          `Pelas tabelas de partilha de 2026: cerca de ${pctS(SHARE.I * 100, 2)} no Anexo I, ${pctS(SHARE.II * 100, 2)} no Anexo II e ${pctS(SHARE.III * 100, 2)} no Anexo III`,
          'Isso equivale a mais ou menos 1 a 1,5 ponto percentual da receita bruta',
          `Bem menos que os ${pctS(CBS_REF)} usados nas simulações do regime regular`,
          'É essa fatia pequena que vira "CBS" dentro do DAS no modelo unificado',
        ],
      },
      {
        type: 'breakdown-chart',
        total: G.das,
        parts: [
          { label: 'IRPJ + CSLL + CPP (estimativa)', value: 1515 },
          { label: 'ICMS', value: 1020 },
          { label: `CBS — substitui PIS + COFINS (${pctS(SHARE.I * 100, 1)} do DAS)`, value: G.fatia },
        ],
      },
      {
        type: 'paragraph',
        text: `Exemplo: empresa do Anexo I com ${brl(G.rec)} de receita mensal e alíquota efetiva de ${pctS(G.aliq * 100, 0)}, ou seja, DAS de ${brl(G.das)}. A única mudança visível na guia é o nome — "PIS/COFINS" vira "CBS" — e o total continua ${brl(G.das)}.`,
      },
      { type: 'heading', text: 'Modelo 2 — CBS fora do DAS' },
      {
        type: 'paragraph',
        text: `Aqui a mudança é estrutural. O PIS e a COFINS saem do DAS, que passa a trazer só IRPJ, CSLL, CPP e ICMS ou ISS. Em paralelo, a empresa apura e paga a CBS em guia própria, aplicando a alíquota sobre a receita e descontando os créditos das compras com nota.`,
      },
      {
        type: 'table',
        headers: ['A conta do Modelo 2', 'Valor'],
        rows: [
          ['DAS reduzido, sem a fatia de PIS/COFINS', brl(G.dasReduzido)],
          [`CBS bruta (${pctS(CBS_REF)} sobre ${brl(G.rec)})`, brl(G.cbsBruta)],
          [`Crédito sobre compras de ${brl(G.compras)}`, `− ${brl(G.credito)}`],
          ['CBS líquida em guia própria', brl(G.cbsLiquida)],
          ['Total do Modelo 2', brl(G.modelo2)],
        ],
        caption: `Contra ${brl(G.das)} do Modelo 1 — ${brl(G.modelo2 - G.das)} a mais por mês`,
      },
      {
        type: 'callout',
        tone: 'danger',
        title: 'RESULTADO DO EXEMPLO',
        items: [
          `Modelo 1: ${brl(G.das)} por mês, numa guia só`,
          `Modelo 2: ${brl(G.dasReduzido)} de DAS mais ${brl(G.cbsLiquida)} de CBS = ${brl(G.modelo2)}`,
          `Mesmo com metade das compras gerando crédito, o Modelo 2 sai ${brl(G.modelo2 - G.das)} mais caro`,
          `O motivo é aritmético: ${pctS(CBS_REF)} de saída contra pouco mais de 1 ponto que já estava embutido no DAS`,
        ],
      },
      {
        type: 'quiz',
        question: 'O que muda na guia de quem fica no modelo unificado a partir de 2027?',
        options: [
          'O valor sobe, porque a CBS é maior que o PIS/COFINS',
          'Só o nome do tributo dentro da composição do DAS — o total continua igual',
          'Passa a haver duas guias',
        ],
        correct: 1,
        explanation:
          'A alíquota efetiva do DAS é recalculada para manter a carga total. O contribuinte que não optar por nada vai notar a diferença na descrição da guia e na nota fiscal, não no valor a pagar.',
      },
    ],
  },

  /* ------------------------------------------------------------- 5 */
  {
    id: 'peso-do-credito',
    shortTitle: 'O peso do crédito',
    kicker: 'MÓDULO 05 · A CONTA',
    title: 'O crédito é quem decide a conta',
    summary:
      'No regime regular ninguém paga a alíquota cheia. Quanto se paga de verdade depende de uma única variável: quanto você compra com nota.',
    content: [
      { type: 'heading', text: 'A CBS efetiva quase nunca é a alíquota cheia' },
      {
        type: 'paragraph',
        text: 'No regime regular a empresa não paga a alíquota cheia sobre a receita: paga sobre a receita menos o crédito das compras. Quanto maior a proporção de compras com nota, menor a CBS efetiva.',
      },
      {
        type: 'table',
        headers: ['Compras com nota, em % da receita', 'CBS efetiva sobre a receita'],
        rows: [0, 20, 40, 55, 70, 90].map((c) => [`${c}%`, pctS(CBS_REF * (1 - c / 100))]),
        caption: `Usando ${pctS(CBS_REF)} como referência de estudo`,
      },
      {
        type: 'calculator',
        fields: [
          { id: 'receita', label: 'Receita mensal (R$)', type: 'currency', placeholder: String(G.rec) },
          { id: 'aliqDas', label: 'Alíquota efetiva do DAS (%)', type: 'percentage', placeholder: '6' },
          { id: 'anexo', label: 'O seu anexo', type: 'select', options: ['Anexo I — comércio', 'Anexo II — indústria', 'Anexo III — serviços'] },
          { id: 'compras', label: 'Compras com nota fiscal por mês (R$)', type: 'currency', placeholder: String(G.compras) },
          { id: 'aliqCbs', label: 'Alíquota de CBS de referência (%)', type: 'percentage', placeholder: String(CBS_REF) },
        ],
        formula:
          `if (!(receita > 0)) { return { aviso: 'Informe a sua receita mensal.' }; } const share = anexo === 'Anexo II — indústria' ? ${SHARE.II} : anexo === 'Anexo III — serviços' ? ${SHARE.III} : ${SHARE.I}; const das = receita * (aliqDas / 100); const fatia = das * share; const dasReduzido = das - fatia; const bruta = receita * (aliqCbs / 100); const credito = compras * (aliqCbs / 100); const liquida = Math.max(0, bruta - credito); const modelo2 = dasReduzido + liquida; const diferenca = modelo2 - das; const equilibrio = aliqCbs > 0 ? ((aliqCbs / 100 - fatia / receita) / (aliqCbs / 100)) * 100 : 0; const leitura = diferenca <= 0 ? 'Neste cenário o regime regular sai mais barato — e ainda dá crédito cheio ao cliente PJ.' : 'Neste cenário o modelo unificado sai mais barato. O regime regular só empataria com mais compras com nota.'; return { modelo1: das, dasReduzido, liquida, modelo2, diferenca, equilibrio, leitura };`,
        resultLabel: 'Modelo 1 × Modelo 2',
        resultFormat: 'object',
        resultFields: [
          { key: 'modelo1', label: 'Modelo 1 — DAS único', format: 'currency' },
          { key: 'dasReduzido', label: 'Modelo 2 — DAS reduzido', format: 'currency' },
          { key: 'liquida', label: 'Modelo 2 — CBS em guia própria', format: 'currency' },
          { key: 'modelo2', label: 'Modelo 2 — total', format: 'currency' },
          { key: 'diferenca', label: 'Diferença (positivo = mais caro fora do DAS)', format: 'currency' },
          { key: 'equilibrio', label: 'Compras com nota para empatar (% da receita)', format: 'percentage' },
          { key: 'leitura', label: 'Leitura', format: 'text' },
        ],
      },
      {
        type: 'comparison',
        columns: [
          {
            label: 'CBS no DAS — modelo unificado',
            tone: 'positive',
            items: [
              'Uma guia só, sem apuração separada',
              'Carga total igual à de hoje',
              'Crédito repassado ao cliente PJ é pequeno, de 1 a 1,5% da venda',
              'Indicado quando as compras com nota são baixas frente à receita',
            ],
          },
          {
            label: 'CBS fora do DAS — regime regular',
            tone: 'negative',
            items: [
              'Duas guias: DAS reduzido mais guia própria de CBS',
              'Exige nota fiscal em praticamente toda compra',
              `Crédito repassado ao cliente PJ é o valor cheio, hoje estimado em ${pctS(CBS_REF)}`,
              'Só tende a compensar com compras perto de 85 a 90% da receita — salvo se a sua atividade tiver redução de alíquota, o que o módulo 4 mostra',
            ],
          },
        ],
      },
      {
        type: 'callout',
        tone: 'success',
        title: 'A REGRA DA DESISTÊNCIA',
        items: [
          'Dá para optar pelo regime regular em setembro e desistir até 30 de novembro, sem penalidade',
          'Isso permite testar a decisão com dados reais antes de ela valer',
          'Depois de novembro, a próxima chance de mudar é em março de 2027',
          'Na dúvida, o caminho conservador é ficar no unificado: ele é o padrão e o mais barato na maioria dos casos',
        ],
      },
      {
        type: 'quiz',
        question: 'Por que o Modelo 2 costuma sair mais caro mesmo com bastante crédito?',
        options: [
          'Porque o DAS não diminui ao sair a CBS',
          'Porque a alíquota de saída é muito maior que a fatia de PIS/COFINS que já estava embutida no DAS',
          'Porque o regime regular cobra uma taxa adicional',
        ],
        correct: 1,
        explanation:
          `O DAS diminui, sim — mas só da fatia de PIS/COFINS, que é pouco mais de 1 ponto da receita. Em troca entra uma alíquota de saída de ${pctS(CBS_REF)}. Para essa troca empatar, o crédito precisa devorar quase toda a alíquota nova, e isso exige comprar com nota quase tanto quanto se fatura.`,
      },
    ],
  },

  /* ------------------------------------------------------------- 4 */
  {
    id: 'reducoes',
    shortTitle: 'Alíquotas reduzidas',
    kicker: 'MÓDULO 04 · REDUÇÕES',
    title: 'Os setores com alíquota reduzida',
    summary:
      'A lei prevê descontos de 30%, 60% e até alíquota zero para certas atividades. Para o Simples, isso só importa num caso — e nesse caso muda tudo.',
    content: [
      {
        type: 'paragraph',
        text: 'A LC 214/2025 não aplica a mesma alíquota a todo mundo. Alguns setores têm redução, outros têm alíquota zero, outros ainda têm regime próprio. Antes de olhar a lista, é preciso entender quando isso te alcança.',
      },
      {
        type: 'callout',
        tone: 'danger',
        title: 'A REGRA QUE QUASE NINGUÉM EXPLICA',
        items: [
          'No modelo unificado, a redução setorial NÃO muda o seu DAS: ele continua pelas tabelas do Simples',
          'A redução vale para quem apura CBS pelo regime regular',
          'Ou seja: ela só entra na sua conta se você optar pelo Modelo 2',
          'E é justamente aí que ela pode virar a decisão — é o que o módulo 5 calcula',
        ],
      },
      { type: 'heading', text: 'Redução de 60%' },
      {
        type: 'table',
        headers: ['Grupo', 'Exemplos'],
        rows: [
          ['Saúde', 'Serviços de saúde, dispositivos médicos e de acessibilidade, medicamentos'],
          ['Educação', 'Ensino infantil, fundamental, médio, técnico e superior'],
          ['Alimentação', 'Alimentos destinados ao consumo humano fora da cesta básica'],
          ['Higiene e limpeza', 'Produtos de higiene pessoal e limpeza de consumo popular'],
          ['Agropecuária', 'Produtos in natura, insumos agropecuários e aquícolas'],
          ['Transporte coletivo', 'Rodoviário, ferroviário, hidroviário e metroviário de passageiros'],
          ['Cultura e imprensa', 'Produções artísticas, culturais, jornalísticas e desportivas nacionais'],
        ],
        caption: `Com desconto de 60%, a alíquota de referência cai de ${pctS(CBS_REF)} para ${pctS(reduzida(RED_60))}`,
      },
      { type: 'heading', text: 'Redução de 30%' },
      {
        type: 'paragraph',
        text: 'Aplica-se aos serviços prestados por profissionais de profissão regulamentada, quando prestados pessoalmente pelo profissional. A lista inclui advogado, contabilista, engenheiro, arquiteto, administrador, economista, médico veterinário, químico, estatístico, técnico industrial e técnico agrícola, entre outros.',
      },
      {
        type: 'stats',
        items: [
          { value: pctS(CBS_REF), label: 'alíquota de referência', hint: 'sem redução' },
          { value: pctS(reduzida(RED_30)), label: 'com redução de 30%', hint: 'profissão regulamentada' },
          { value: pctS(reduzida(RED_60)), label: 'com redução de 60%', hint: 'saúde, educação, alimentos' },
        ],
      },
      { type: 'heading', text: 'Alíquota zero' },
      {
        type: 'callout',
        tone: 'success',
        title: 'ONDE A CBS É ZERO',
        items: [
          'Cesta Básica Nacional de Alimentos',
          'Produtos hortícolas, frutas e ovos',
          'Medicamentos e dispositivos de acessibilidade previstos em lista específica',
          'Serviços de educação superior no âmbito do Prouni',
        ],
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'DUAS COISAS PARA NÃO CONFUNDIR',
        items: [
          'Alíquota zero não é isenção: você continua contribuinte e continua tomando crédito das compras',
          'Quem vende com alíquota reduzida também repassa crédito menor ao cliente — a redução corta dos dois lados',
          'Setores como combustíveis, serviços financeiros, planos de saúde, imóveis, hotelaria, bares e restaurantes têm regime específico, com regras próprias',
          'A lista definitiva é por item e por atividade: confirme o enquadramento do seu CNAE com o contador',
        ],
      },
      {
        type: 'quiz',
        question: 'Uma clínica do Simples fica no modelo unificado. A redução de 60% da saúde reduz o DAS dela?',
        options: [
          'Reduz, o DAS cai 60%',
          'Não reduz nada: no modelo unificado o DAS segue as tabelas do Simples',
          'Reduz só a parte de ISS',
        ],
        correct: 1,
        explanation:
          'A redução é da alíquota de CBS do regime regular. Quem fica no DAS continua pagando pela tabela do anexo, como sempre. A redução só aparece na conta de quem apura CBS por fora — e é por isso que, para esses setores, o Modelo 2 merece ser calculado de verdade em vez de descartado de cara.',
      },
    ],
  },

  /* ------------------------------------------------------------- 6 */
  {
    id: 'quando-compensa',
    shortTitle: 'Quando compensa',
    kicker: 'MÓDULO 06 · O PONTO DE VIRADA',
    title: 'Quando a redução vira a conta',
    summary:
      'Sem redução, o regime regular exige quase 90% de compras com nota para empatar. Com redução, esse número despenca.',
    content: [
      {
        type: 'paragraph',
        text: 'O ponto de equilíbrio é a fatia de compras com nota, em relação à receita, que faz os dois modelos custarem o mesmo. Ele depende de duas coisas: a fatia de PIS/COFINS que já está no seu DAS e a alíquota de saída da sua atividade. Reduzir a alíquota de saída derruba o ponto de equilíbrio.',
      },
      { type: 'math', expression: 'Equil\\acute{i}brio = \\frac{Sa\\acute{i}da - PIS/COFINS\\ no\\ DAS}{Cr\\acute{e}dito}' },
      {
        type: 'paragraph',
        text: 'Em palavras: a sua alíquota de saída, menos a fatia de PIS/COFINS que já está embutida no DAS, dividida pela alíquota do crédito que os seus fornecedores destacam. Baixar a primeira — que é o que a redução setorial faz — derruba o resultado inteiro.',
      },
      {
        type: 'table',
        headers: ['Situação', 'Alíquota de saída', 'Compras com nota para empatar'],
        rows: [
          ['Sem redução', pctS(CBS_REF), pctS(S.equilibrio, 1)],
          ['Profissão regulamentada (−30%)', pctS(S.aliqRed), pctS(S.equilibrioRed, 1)],
          ['Saúde, educação, alimentos (−60%)', pctS(reduzida(RED_60)), pctS(C.equilibrio, 1)],
        ],
        caption: 'Calculado sobre um Anexo III com alíquota efetiva de 7% — o do escritório do módulo 8',
      },
      {
        type: 'highlight',
        text: `Sem redução, o escritório precisaria comprar ${pctS(S.equilibrio, 0)} da receita com nota para empatar, o que é impossível para quem vive de folha. Com a redução de 30%, o alvo cai para ${pctS(S.equilibrioRed, 0)}. Com 60%, para ${pctS(C.equilibrio, 0)}.`,
      },
      { type: 'heading', text: 'Uma clínica, com a redução de 60%' },
      {
        type: 'table',
        headers: ['Clínica do Anexo III', 'Valor'],
        rows: [
          ['Receita mensal', brl(C.rec)],
          [`DAS hoje (${pctS(C.aliq * 100, 0)})`, brl(C.das)],
          ['DAS reduzido, sem PIS/COFINS', brl(C.dasReduzido)],
          [`CBS bruta com redução de 60% (${pctS(C.aliqRed)})`, brl(C.cbsBruta)],
          [`Crédito sobre insumos de ${brl(C.insumos)}`, `− ${brl(C.credito)}`],
          ['CBS líquida', brl(C.cbsLiquida)],
          ['Modelo 2 — total', brl(C.modelo2)],
          ['Modelo 1 — total', brl(C.das)],
          ['Diferença', `${C.modelo2 > C.das ? '+' : ''}${brl(C.modelo2 - C.das)}`],
        ],
        caption:
          C.modelo2 < C.das
            ? 'Com a redução de 60%, o regime regular fica mais barato mesmo com poucos insumos'
            : 'Mesmo com a redução, o unificado segue à frente neste volume de insumos',
      },
      {
        type: 'calculator',
        fields: [
          { id: 'receita', label: 'Receita mensal (R$)', type: 'currency', placeholder: String(S.rec) },
          { id: 'aliqDas', label: 'Alíquota efetiva do DAS (%)', type: 'percentage', placeholder: '7' },
          { id: 'anexo', label: 'O seu anexo', type: 'select', options: ['Anexo III — serviços', 'Anexo I — comércio', 'Anexo II — indústria'] },
          { id: 'reducao', label: 'A sua atividade tem redução?', type: 'select', options: ['Não tem redução', 'Profissão regulamentada (−30%)', 'Saúde, educação, alimentos (−60%)', 'Alíquota zero'] },
          { id: 'compras', label: 'Compras com nota fiscal por mês (R$)', type: 'currency', placeholder: String(S.insumos) },
          { id: 'aliqCbs', label: 'Alíquota de CBS de referência (%)', type: 'percentage', placeholder: String(CBS_REF) },
        ],
        formula:
          `if (!(receita > 0)) { return { aviso: 'Informe a sua receita mensal.' }; } const share = anexo === 'Anexo II — indústria' ? ${SHARE.II} : anexo === 'Anexo I — comércio' ? ${SHARE.I} : ${SHARE.III}; const corte = reducao === 'Profissão regulamentada (−30%)' ? 0.3 : reducao === 'Saúde, educação, alimentos (−60%)' ? 0.6 : reducao === 'Alíquota zero' ? 1 : 0; const saida = aliqCbs * (1 - corte); const das = receita * (aliqDas / 100); const fatia = das * share; const dasReduzido = das - fatia; const bruta = receita * (saida / 100); const credito = compras * (aliqCbs / 100); const liquida = Math.max(0, bruta - credito); const modelo2 = dasReduzido + liquida; const diferenca = modelo2 - das; const equilibrio = aliqCbs > 0 ? ((saida / 100 - fatia / receita) / (aliqCbs / 100)) * 100 : 0; const alvo = equilibrio <= 0 ? 'Nenhuma: a sua alíquota de saída já é menor que a fatia embutida no DAS.' : equilibrio > 100 ? 'Acima de 100% da receita, o que na prática é inalcançável.' : equilibrio.toFixed(1) + '% da receita, ou ' + (receita * equilibrio / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ' por mês.'; return { saida, modelo1: das, modelo2, diferenca, equilibrio, alvo };`,
        resultLabel: 'O seu ponto de equilíbrio',
        resultFormat: 'object',
        resultFields: [
          { key: 'saida', label: 'A sua alíquota de saída', format: 'percentage' },
          { key: 'modelo1', label: 'Modelo 1 — DAS único', format: 'currency' },
          { key: 'modelo2', label: 'Modelo 2 — total', format: 'currency' },
          { key: 'diferenca', label: 'Diferença (positivo = mais caro fora do DAS)', format: 'currency' },
          { key: 'equilibrio', label: 'Equilíbrio (% da receita)', format: 'percentage' },
          { key: 'alvo', label: 'Quanto você precisaria comprar com nota', format: 'text' },
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'QUEM TALVEZ COMPENSE OLHAR COM CARINHO',
        items: [
          'Atacado, distribuidora e revenda de baixo valor agregado: compras já perto de 90% da receita',
          'Clínica, laboratório e escola que vendem para empresa e têm redução de 60%',
          'Profissional regulamentado com carteira majoritariamente PJ e redução de 30%',
          'Quem vende com alíquota zero e compra tributado: acumula crédito em vez de pagar',
          'Indústria com insumo muito pesado na receita e cliente PJ exigente por crédito',
        ],
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'QUEM QUASE CERTAMENTE NÃO COMPENSA',
        items: [
          'Serviço intensivo em mão de obra sem redução: a folha não gera crédito',
          'Qualquer negócio com a maior parte das vendas para consumidor final',
          'Comércio com margem gorda e compras abaixo de 60% da receita',
          'Quem não tem estrutura para apurar e declarar uma guia a mais todo mês',
        ],
      },
      {
        type: 'quiz',
        question: 'Uma padaria vende muito item de cesta básica, com alíquota zero, e compra insumo tributado. O que acontece no regime regular?',
        options: [
          'Ela paga a alíquota cheia mesmo assim',
          'Ela fica com crédito acumulado, porque tem crédito na compra e pouca ou nenhuma CBS na venda',
          'Ela não pode optar pelo regime regular',
        ],
        correct: 1,
        explanation:
          'Alíquota zero na saída não anula o crédito da entrada. Quem compra tributado e vende a zero acumula crédito — e é a situação mais favorável que existe no regime regular. Vale calcular caso a caso, porque a proporção de itens com alíquota zero raramente é 100%.',
      },
    ],
  },

  /* ------------------------------------------------------------- 7 */
  {
    id: 'impacto-comercio',
    shortTitle: 'Impacto no Comércio',
    kicker: 'MÓDULO 07 · SETOR',
    title: 'Exemplo real: o impacto da CBS no Comércio',
    summary:
      'Uma loja de materiais de construção do Anexo I, e o que muda no resultado dela em cada modelo.',
    content: [
      {
        type: 'paragraph',
        text: `Uma loja de materiais de construção optante pelo Simples, Anexo I, fatura ${brl(L.rec)} por mês. Vende 60% para consumidor final e 40% para empresas — pedreiros, construtoras, revendedores. O custo da mercadoria é ${brl(L.custo)}, ou ${pctS((L.custo / L.rec) * 100, 0)} da receita, tudo com nota fiscal.`,
      },
      { type: 'heading', text: 'Cenário A — CBS no DAS' },
      {
        type: 'paragraph',
        text: `Com alíquota efetiva de ${pctS(L.aliq * 100, 0)}, o DAS é ${brl(L.das)} e não muda com a Reforma. Pela tabela de partilha do Anexo I, PIS e COFINS são ${pctS(SHARE.I * 100, 1)} do DAS: a fatia que vira CBS é ${brl(L.fatia)}, ou ${pctS((L.fatia / L.rec) * 100)} da receita. O cliente PJ que comprar ${brl(1000)} leva ${brl(1000 * (L.fatia / L.rec))} de crédito.`,
      },
      { type: 'heading', text: 'Cenário B — CBS fora do DAS' },
      {
        type: 'table',
        headers: ['Linha', 'Valor'],
        rows: [
          ['Receita bruta mensal', brl(L.rec)],
          ['Custo da mercadoria, com crédito', brl(L.custo)],
          [`CBS bruta (${pctS(CBS_REF)} sobre a receita)`, brl(L.cbsBruta)],
          [`Crédito de CBS sobre as compras`, `− ${brl(L.credito)}`],
          ['CBS líquida a pagar', brl(L.cbsLiquida)],
          ['DAS reduzido, sem PIS/COFINS', brl(L.dasReduzido)],
          ['Despesas operacionais', brl(L.desp)],
          ['Margem líquida mensal', brl(L.margem)],
        ],
        caption: `A CBS líquida representa ${pctS((L.cbsLiquida / L.rec) * 100)} da receita, não ${pctS(CBS_REF)} — é o crédito trabalhando`,
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'RESULTADO DA SIMULAÇÃO',
        items: [
          `Modelo 1: ${brl(L.das)} por mês · crédito ao cliente PJ de ${pctS((L.fatia / L.rec) * 100)} da venda`,
          `Modelo 2: ${brl(L.dasReduzido)} de DAS mais ${brl(L.cbsLiquida)} de CBS = ${brl(L.modelo2)} · crédito de ${pctS(CBS_REF)}`,
          `Diferença: ${brl(L.modelo2 - L.das)} a mais por mês, ou ${pctS(((L.modelo2 - L.das) / L.das) * 100, 0)} mais caro`,
          `Ponto de equilíbrio: as compras precisariam chegar a ${pctS(L.equilibrio, 1)} da receita`,
        ],
      },
      {
        type: 'highlight',
        text: 'No comércio com margem normal, sair do DAS não compensa em custo tributário — mas pode compensar comercialmente, se os clientes PJ valorizarem o crédito cheio mais do que você paga a mais por ele.',
      },
      { type: 'heading', text: 'O mesmo setor, com margem apertada' },
      {
        type: 'paragraph',
        text: `Agora uma distribuidora, também Anexo I, com ${brl(D.rec)} de receita e ${brl(D.custo)} de custo de mercadoria — ${pctS((D.custo / D.rec) * 100, 0)} da receita, praticamente tudo com nota de fornecedor.`,
      },
      {
        type: 'table',
        headers: ['Linha', 'Valor'],
        rows: [
          ['Receita bruta mensal', brl(D.rec)],
          ['Custo da mercadoria, com crédito', brl(D.custo)],
          [`CBS bruta (${pctS(CBS_REF)})`, brl(D.cbsBruta)],
          ['Crédito de CBS sobre as compras', `− ${brl(D.credito)}`],
          ['CBS líquida a pagar', brl(D.cbsLiquida)],
          ['DAS reduzido', brl(D.dasReduzido)],
          ['Modelo 2 — total', brl(D.modelo2)],
          ['Modelo 1 — total', brl(D.das)],
        ],
        caption: `Aqui o Modelo 2 sai ${brl(D.das - D.modelo2)} mais barato por mês`,
      },
      {
        type: 'callout',
        tone: 'success',
        title: 'POR QUE A DISTRIBUIDORA VIRA O JOGO',
        items: [
          `As compras equivalem a ${pctS((D.custo / D.rec) * 100, 0)} da receita, acima do equilíbrio de ${pctS(L.equilibrio, 1)}`,
          `A CBS líquida cai para ${brl(D.cbsLiquida)}, ou ${pctS((D.cbsLiquida / D.rec) * 100)} da receita`,
          `Economia de ${brl(D.das - D.modelo2)} por mês, ou ${brl((D.das - D.modelo2) * 12)} no ano`,
          `E o cliente PJ passa a receber ${pctS(CBS_REF)} de crédito em vez de ${pctS((L.fatia / L.rec) * 100)}`,
        ],
      },
      {
        type: 'highlight',
        text: 'A regra prática do comércio: margem apertada e compras perto de 85 a 90% da receita — atacado, distribuição, revenda de baixo valor agregado — tendem a se beneficiar do Modelo 2. Margem maior tende a pagar mais fora do DAS.',
      },
      {
        type: 'classify-exercise',
        items: [
          'Compra de mercadoria de fornecedor com nota fiscal eletrônica',
          'Aluguel do ponto comercial pago sem documento fiscal',
          'Frete contratado de transportadora com CNPJ e nota fiscal',
          'Compra de mercadoria de um fornecedor pessoa física, sem nota',
          'Conta de energia elétrica da loja com nota fiscal',
          'Salário e encargos dos vendedores',
        ],
        categories: ['Gera crédito de CBS', 'Não gera crédito de CBS'],
        answerKey: {
          'Compra de mercadoria de fornecedor com nota fiscal eletrônica': 'Gera crédito de CBS',
          'Aluguel do ponto comercial pago sem documento fiscal': 'Não gera crédito de CBS',
          'Frete contratado de transportadora com CNPJ e nota fiscal': 'Gera crédito de CBS',
          'Compra de mercadoria de um fornecedor pessoa física, sem nota': 'Não gera crédito de CBS',
          'Conta de energia elétrica da loja com nota fiscal': 'Gera crédito de CBS',
          'Salário e encargos dos vendedores': 'Não gera crédito de CBS',
        },
      },
      {
        type: 'quiz',
        question: 'Duas lojas do Anexo I, mesma receita. A que tem margem menor tende a se dar melhor em qual modelo?',
        options: [
          'No unificado, porque paga menos imposto de qualquer jeito',
          'No regime regular, porque margem menor significa compras maiores e mais crédito',
          'Dá no mesmo, margem não entra na conta',
        ],
        correct: 1,
        explanation:
          'Margem menor é o outro lado de custo de mercadoria maior — e custo de mercadoria com nota é exatamente o que vira crédito. Por isso atacado e distribuição atravessam o ponto de equilíbrio com naturalidade, enquanto o varejo de margem gorda quase nunca chega lá.',
      },
    ],
  },

  /* ------------------------------------------------------------- 8 */
  {
    id: 'impacto-industria',
    shortTitle: 'Impacto na Indústria',
    kicker: 'MÓDULO 08 · SETOR',
    title: 'Exemplo real: o impacto da CBS na Indústria',
    summary: 'Uma pequena indústria de móveis planejados do Anexo II, e o efeito da CBS no resultado dela.',
    content: [
      {
        type: 'paragraph',
        text: `Uma indústria de móveis planejados, Anexo II, fatura ${brl(I.rec)} por mês. Compra madeira, ferragens e insumos com nota — ${brl(I.custo)}, ou ${pctS((I.custo / I.rec) * 100, 0)} da receita — e vende principalmente para lojas e revendedores.`,
      },
      { type: 'heading', text: 'Cenário A — CBS no DAS' },
      {
        type: 'paragraph',
        text: `Com alíquota efetiva de ${pctS(I.aliq * 100, 1)}, o DAS é ${brl(I.das)} e não muda. No Anexo II, PIS e COFINS são ${pctS(SHARE.II * 100, 0)} do DAS: a fatia que vira CBS é ${brl(I.fatia)}, ou ${pctS((I.fatia / I.rec) * 100)} da receita — que é o crédito que o cliente PJ leva.`,
      },
      { type: 'heading', text: 'Cenário B — CBS fora do DAS' },
      {
        type: 'table',
        headers: ['Linha', 'Valor'],
        rows: [
          ['Receita bruta mensal', brl(I.rec)],
          ['Custo dos insumos, com crédito', brl(I.custo)],
          [`CBS bruta (${pctS(CBS_REF)} sobre a receita)`, brl(I.cbsBruta)],
          ['Crédito de CBS sobre as compras', `− ${brl(I.credito)}`],
          ['CBS líquida a pagar', brl(I.cbsLiquida)],
          ['DAS reduzido, sem PIS/COFINS', brl(I.dasReduzido)],
          ['Despesas operacionais (folha, aluguel, energia)', brl(I.desp)],
          ['Margem líquida mensal', brl(I.margem)],
        ],
        caption: `O crédito derruba a CBS de ${pctS(CBS_REF)} para ${pctS((I.cbsLiquida / I.rec) * 100)} da receita`,
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'RESULTADO DA SIMULAÇÃO',
        items: [
          `Modelo 1: ${brl(I.das)} por mês · crédito ao cliente PJ de ${pctS((I.fatia / I.rec) * 100)}`,
          `Modelo 2: ${brl(I.dasReduzido)} mais ${brl(I.cbsLiquida)} = ${brl(I.modelo2)} · crédito de ${pctS(CBS_REF)}`,
          `Diferença: ${brl(I.modelo2 - I.das)} a mais por mês, ou ${pctS(((I.modelo2 - I.das) / I.das) * 100, 0)} mais caro`,
          `Ponto de equilíbrio: compras de ${pctS(I.equilibrio, 1)} da receita`,
        ],
      },
      {
        type: 'highlight',
        text: `Na indústria, o volume de insumos com nota derruba bastante a CBS líquida — de ${pctS(CBS_REF)} para ${pctS((I.cbsLiquida / I.rec) * 100)} da receita — mas ainda fica acima do custo do modelo unificado. A pergunta vira: vale gerar um crédito ${Math.round(CBS_REF / ((I.fatia / I.rec) * 100))} vezes maior para o cliente?`,
      },
      {
        type: 'quiz',
        question: `O que faria essa indústria atravessar o ponto de equilíbrio de ${pctS(I.equilibrio, 0)}?`,
        options: [
          'Aumentar o preço de venda',
          'Ter insumo muito mais pesado na receita, como acontece em indústria de transformação de baixa margem',
          'Contratar mais funcionários',
        ],
        correct: 1,
        explanation:
          'Aumentar preço aumenta a CBS de saída e afasta o equilíbrio. Contratar aumenta a folha, que não gera crédito nenhum. O que aproxima do equilíbrio é insumo comprado com nota pesando mais na receita — ou uma redução de alíquota setorial, como no módulo 5.',
      },
    ],
  },

  /* ------------------------------------------------------------- 9 */
  {
    id: 'impacto-servicos',
    shortTitle: 'Impacto em Serviços',
    kicker: 'MÓDULO 09 · SETOR',
    title: 'Exemplo real: o impacto da CBS em Serviços',
    summary: 'Um escritório de contabilidade do Anexo III — o setor onde a conta do regime regular é mais dura, e onde a redução de 30% mais muda.',
    content: [
      {
        type: 'paragraph',
        text: `Um escritório de contabilidade optante pelo Simples, Anexo III com Fator R acima de 28%, fatura ${brl(S.rec)} por mês. A despesa principal é a folha, que não gera crédito. Os insumos que geram crédito — software, aluguel com nota, material — somam ${brl(S.insumos)}, ou ${pctS((S.insumos / S.rec) * 100, 0)} da receita.`,
      },
      { type: 'heading', text: 'Cenário A — CBS no DAS' },
      {
        type: 'paragraph',
        text: `Com alíquota efetiva de ${pctS(S.aliq * 100, 0)}, o DAS é ${brl(S.das)}. No Anexo III, PIS e COFINS são ${pctS(SHARE.III * 100, 1)} do DAS: a fatia que vira CBS é ${brl(S.fatia)}, ou ${pctS((S.fatia / S.rec) * 100)} da receita.`,
      },
      { type: 'heading', text: 'Cenário B — CBS fora do DAS, sem redução' },
      {
        type: 'table',
        headers: ['Linha', 'Valor'],
        rows: [
          ['Receita bruta mensal', brl(S.rec)],
          [`CBS bruta (${pctS(CBS_REF)} sobre a receita)`, brl(S.cbsBruta)],
          [`Crédito sobre insumos de ${brl(S.insumos)}`, `− ${brl(S.credito)}`],
          ['CBS líquida a pagar', brl(S.cbsLiquida)],
          ['DAS reduzido, sem PIS/COFINS', brl(S.dasReduzido)],
          ['Despesas operacionais (folha, aluguel, softwares)', brl(S.desp)],
          ['Margem líquida mensal', brl(S.margem)],
        ],
        caption: 'Quase não há crédito porque quase não há compra com nota — a folha domina',
      },
      {
        type: 'callout',
        tone: 'danger',
        title: 'RESULTADO SEM A REDUÇÃO',
        items: [
          `Modelo 1: ${brl(S.das)} por mês`,
          `Modelo 2: ${brl(S.dasReduzido)} mais ${brl(S.cbsLiquida)} = ${brl(S.modelo2)}`,
          `Diferença: ${brl(S.modelo2 - S.das)} a mais — o custo praticamente dobra`,
          `Ponto de equilíbrio: ${pctS(S.equilibrio, 1)} da receita em compras com nota, inalcançável para quem vive de folha`,
        ],
      },
      { type: 'heading', text: 'Cenário C — o mesmo escritório, com a redução de 30%' },
      {
        type: 'paragraph',
        text: `Contabilidade é profissão regulamentada, e a lei prevê redução de 30% na alíquota para os serviços prestados nessa condição. A alíquota de saída cai de ${pctS(CBS_REF)} para ${pctS(S.aliqRed)} — e a conta muda de tamanho.`,
      },
      {
        type: 'table',
        headers: ['', 'Sem redução', 'Com redução de 30%'],
        rows: [
          ['Alíquota de saída', pctS(CBS_REF), pctS(S.aliqRed)],
          ['CBS bruta', brl(S.cbsBruta), brl(S.cbsBrutaRed)],
          ['CBS líquida', brl(S.cbsLiquida), brl(S.cbsLiquidaRed)],
          ['Modelo 2 — total', brl(S.modelo2), brl(S.modelo2Red)],
          ['A mais que o Modelo 1', brl(S.modelo2 - S.das), brl(S.modelo2Red - S.das)],
          ['Compras para empatar', pctS(S.equilibrio, 1), pctS(S.equilibrioRed, 1)],
        ],
        caption: 'A redução não inverte a decisão aqui, mas corta a diferença pela metade e traz o equilíbrio para o campo do possível',
      },
      {
        type: 'comparison',
        columns: [
          {
            label: 'Quando pode valer sair do DAS',
            tone: 'positive',
            items: [
              'Compras com nota acima de 80 a 85% da receita, sem redução',
              'Atividade com redução de 60%, que derruba o equilíbrio para perto de 30%',
              'Mais da metade das vendas para PJ que exige crédito destacado',
              'Cliente disposto a pagar mais pelo crédito maior',
            ],
          },
          {
            label: 'Quando normalmente não vale',
            tone: 'negative',
            items: [
              'Serviço intensivo em mão de obra sem redução setorial',
              'Maior parte dos clientes é consumidor final',
              'Poucas despesas com nota fiscal frente à receita',
              'Sem estrutura para apurar e entregar uma obrigação a mais por mês',
            ],
          },
        ],
      },
      {
        type: 'highlight',
        text: 'Em serviços, a pergunta certa não é "quanto vou pagar de imposto", e sim "o crédito extra que meu cliente PJ ganha compensa o que eu pago a mais por ele — e a minha atividade tem redução?".',
      },
      {
        type: 'quiz',
        question: `A redução de 30% fez o equilíbrio do escritório cair de ${pctS(S.equilibrio, 0)} para ${pctS(S.equilibrioRed, 0)}. Isso já resolve?`,
        options: [
          'Resolve: agora compensa sair do DAS',
          `Não por si só — ele compra ${pctS((S.insumos / S.rec) * 100, 0)} da receita com nota, ainda longe de ${pctS(S.equilibrioRed, 0)}`,
          'Não muda nada, a redução é irrelevante',
        ],
        correct: 1,
        explanation:
          'A redução corta a diferença quase pela metade e traz o alvo para o campo do possível, mas o escritório continua longe dele. Ela muda o cálculo de quem tem insumo relevante — uma clínica com equipamento e material, por exemplo — não de quem só tem folha.',
      },
    ],
  },

  /* ------------------------------------------------------------- 10 */
  {
    id: 'sua-conta',
    shortTitle: 'Faça a sua conta',
    kicker: 'MÓDULO 10 · DESAFIO FINAL',
    title: 'Faça a conta da sua empresa',
    summary: 'Tudo o que você viu, aplicado aos números do seu cliente, em uma tela.',
    content: [
      {
        type: 'paragraph',
        text: 'Preencha com os dados reais. O resultado mostra quanto custa cada modelo, de quanto é a diferença, qual seria o ponto de equilíbrio e quanto de crédito o cliente PJ recebe em cada caminho.',
      },
      {
        type: 'calculator',
        fields: [
          { id: 'receita', label: 'Receita mensal (R$)', type: 'currency', placeholder: '40000' },
          { id: 'aliqDas', label: 'Alíquota efetiva do DAS (%)', type: 'percentage', placeholder: '8' },
          { id: 'anexo', label: 'O seu anexo', type: 'select', options: ['Anexo I — comércio', 'Anexo II — indústria', 'Anexo III — serviços'] },
          { id: 'reducao', label: 'Redução de alíquota da atividade', type: 'select', options: ['Não tem redução', 'Profissão regulamentada (−30%)', 'Saúde, educação, alimentos (−60%)', 'Alíquota zero'] },
          { id: 'compras', label: 'Compras com nota fiscal por mês (R$)', type: 'currency', placeholder: '22000' },
          { id: 'pctPJ', label: 'Vendas para PJ do regime regular (%)', type: 'percentage', placeholder: '40' },
          { id: 'aliqCbs', label: 'Alíquota de CBS de referência (%)', type: 'percentage', placeholder: String(CBS_REF) },
        ],
        formula:
          `if (!(receita > 0)) { return { aviso: 'Informe a receita mensal da empresa.' }; } if (!(aliqCbs > 0)) { return { aviso: 'Informe a alíquota de CBS que você quer usar como referência.' }; } const share = anexo === 'Anexo II — indústria' ? ${SHARE.II} : anexo === 'Anexo III — serviços' ? ${SHARE.III} : ${SHARE.I}; const corte = reducao === 'Profissão regulamentada (−30%)' ? 0.3 : reducao === 'Saúde, educação, alimentos (−60%)' ? 0.6 : reducao === 'Alíquota zero' ? 1 : 0; const saida = aliqCbs * (1 - corte); const das = receita * (aliqDas / 100); const fatia = das * share; const dasReduzido = das - fatia; const bruta = receita * (saida / 100); const credito = compras * (aliqCbs / 100); const liquida = Math.max(0, bruta - credito); const modelo2 = dasReduzido + liquida; const diferenca = modelo2 - das; const equilibrio = ((saida / 100 - fatia / receita) / (aliqCbs / 100)) * 100; const comprasHoje = (compras / receita) * 100; const creditoUnificado = (fatia / receita) * 100; const vendasPJ = receita * (pctPJ / 100); const ganhoCliente = vendasPJ * ((saida - creditoUnificado) / 100); let leitura; if (diferenca <= 0) { leitura = 'O regime regular sai mais barato E dá mais crédito ao cliente. Vale simular com o contador antes da janela.'; } else if (comprasHoje >= equilibrio - 5) { leitura = 'Você está na beira do equilíbrio: pequenas mudanças no volume de compras com nota viram a decisão.'; } else { leitura = 'O modelo unificado sai mais barato. Só compensaria sair se o crédito extra valer, comercialmente, mais que a diferença.'; } return { saida, modelo1: das, modelo2, diferenca, anual: diferenca * 12, equilibrio, comprasHoje, ganhoCliente, leitura };`,
        resultLabel: 'O seu diagnóstico',
        resultFormat: 'object',
        resultFields: [
          { key: 'saida', label: 'A sua alíquota de saída', format: 'percentage' },
          { key: 'modelo1', label: 'Modelo 1 — DAS único', format: 'currency' },
          { key: 'modelo2', label: 'Modelo 2 — DAS reduzido + CBS', format: 'currency' },
          { key: 'diferenca', label: 'Diferença por mês', format: 'currency' },
          { key: 'anual', label: 'Diferença no ano', format: 'currency' },
          { key: 'comprasHoje', label: 'Suas compras com nota hoje (% da receita)', format: 'percentage' },
          { key: 'equilibrio', label: 'Equilíbrio necessário (% da receita)', format: 'percentage' },
          { key: 'ganhoCliente', label: 'Crédito a mais que os clientes PJ ganhariam', format: 'currency' },
          { key: 'leitura', label: 'Leitura', format: 'text' },
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'COMO LER O SEU RESULTADO',
        items: [
          'Diferença negativa: o regime regular é mais barato — caso raro, mas existe em atacado e em atividade com redução',
          'Compras hoje bem abaixo do equilíbrio: fique no unificado e não perca tempo',
          'Compras perto do equilíbrio: simule de novo com a alíquota oficial quando ela sair, ainda dá tempo em março',
          'Crédito a mais alto e cliente PJ exigente: aí a decisão deixa de ser tributária e vira comercial',
        ],
      },
      { type: 'heading', text: 'O roteiro da decisão' },
      {
        type: 'checklist',
        items: [
          'Levantar a receita bruta dos últimos 12 meses e a alíquota efetiva atual do DAS',
          'Mapear o percentual de compras com nota fiscal sobre a receita — é o dado que mais pesa',
          'Conferir se a atividade tem redução de 30%, 60% ou alíquota zero',
          'Separar as vendas entre PJ do regime regular, PJ do Simples e consumidor final',
          'Rodar a simulação com a alíquota de referência e também com cenários mais baixos',
          'Decidir dentro da janela de setembro, lembrando que dá para desistir até 30 de novembro',
        ],
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'O QUE ESTA CONTA NÃO INCLUI',
        items: [
          'O custo de apurar e declarar a CBS todo mês, que no regime regular é obrigação nova',
          'O efeito do split payment no capital de giro',
          'O IBS, que entra depois e tem regras próprias',
          'A alíquota oficial, que ainda depende de resolução do Senado',
        ],
      },
      {
        type: 'highlight',
        text: 'Não decidir é decidir ficar no DAS. Para a maioria das empresas do Simples, essa é a resposta certa — e o valor deste curso é você conseguir provar isso com número, em vez de torcer.',
      },
    ],
  },
];

// O número do módulo sai da posição no array, não do texto escrito à mão:
// ao inserir ou mover um módulo, a numeração não tem como sair errada.
modules.forEach((m, i) => {
  m.kicker = m.kicker.replace(/^MÓDULO\s+\d+/, `MÓDULO ${String(i + 1).padStart(2, '0')}`);
});

const curso = {
  slug: 'reforma-tributaria-simples-nacional',
  courseName: 'Reforma Tributária e o Simples Nacional',
  description:
    'Como a Reforma Tributária atinge quem está no Simples Nacional, com foco na CBS. A decisão entre recolher dentro do DAS ou em guia própria, os setores com alíquota reduzida, o ponto de equilíbrio de cada caso e exemplos completos para comércio, indústria e serviços.',
  category: 'Simples Nacional',
  leadCapture: 'end',
  image: '/uploads/mue68fi2-ef784f315f68e2e6.jpg',
  modules,
};

fs.writeFileSync('reforma-tributaria-simples-nacional.json', JSON.stringify(curso, null, 2), 'utf-8');
const tam = modules.map((m) => JSON.stringify(m.content).length);
console.log(
  `reforma-tributaria-simples-nacional.json  ${modules.length} módulos | maior ${Math.max(...tam)} | média ${Math.round(
    tam.reduce((a, b) => a + b) / tam.length
  )}`
);
