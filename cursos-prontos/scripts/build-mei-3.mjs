import {
  SALARIO_MINIMO, LIMITE, LIMITE_MES,
  INSS_MEI, DAS_COMERCIO, DAS_SERVICO,
  brl, brlCheio, num, grava,
} from './mei-base.mjs';

/*
 * Curso 3 da série do MEI: o dinheiro.
 *
 * Silvana (bolos, comércio/indústria): fatura R$ 5.200/mês, ingredientes R$ 2.100
 * Rogério (ar-condicionado, serviço):  fatura R$ 6.000/mês, peças R$ 1.400
 *
 * Presunção de lucro para a isenção do IR: 8% no comércio, 32% no serviço.
 */

const FAT_S = 5200;
const CUSTO_S = 2100;
const FAT_R = 6000;

const PRESUNCAO_COMERCIO = 0.08;
const PRESUNCAO_SERVICO = 0.32;

const isentoS = FAT_S * 12 * PRESUNCAO_COMERCIO - DAS_COMERCIO * 12;
const isentoR = FAT_R * 12 * PRESUNCAO_SERVICO - DAS_SERVICO * 12;

const modules = [
  /* ------------------------------------------------------------- 1 */
  {
    id: 'pf-pj',
    shortTitle: 'Misturar é o erro 1',
    kicker: 'MÓDULO 01 · SEPARAÇÃO',
    title: 'Misturar a conta pessoal com a da empresa',
    summary: 'É o erro número um do MEI, e ele não é sobre organização. É sobre não saber se o negócio dá certo.',
    content: [
      {
        type: 'paragraph',
        text: 'A maioria dos MEIs recebe na conta pessoal, paga fornecedor na conta pessoal e paga o mercado na mesma conta. Não é preguiça: é que ninguém explicou o preço disso. E o preço não é uma multa — é você não conseguir responder se o seu negócio está dando dinheiro.',
      },
      {
        type: 'comparison',
        columns: [
          {
            label: 'Tudo numa conta só',
            tone: 'negative',
            items: [
              'Você não sabe quanto o negócio faturou sem catar no extrato',
              'Não sabe quanto gastou de insumo nem quanto sobrou',
              'Acha que foi um mês bom porque o saldo está alto — e era só um adiantamento',
              'Na hora de provar renda para financiamento, não tem o que mostrar',
            ],
          },
          {
            label: 'Duas contas',
            tone: 'positive',
            items: [
              'O extrato da PJ é o seu relatório de faturamento, pronto',
              'O que sobra na PJ depois dos custos é o resultado real',
              'Você se paga por transferência, numa data combinada',
              'Comprovação de renda e histórico de crédito no CNPJ',
            ],
          },
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'COMO COMEÇAR AMANHÃ',
        items: [
          'Abra uma conta PJ de MEI — a maioria dos bancos digitais não cobra mensalidade',
          'Aponte a maquininha e o PIX da empresa para ela',
          'Pague DAS, fornecedor e insumo só por ela',
          'Defina um dia do mês para transferir o seu dinheiro para a conta pessoal',
        ],
      },
      {
        type: 'highlight',
        text: 'Você não precisa de planilha para começar a entender o seu negócio. Precisa de duas contas e de uma data fixa para se pagar.',
      },
      {
        type: 'quiz',
        question: 'Qual a vantagem mais imediata de separar as contas?',
        options: [
          'Pagar menos imposto',
          'Passar a enxergar quanto o negócio realmente gera, sem confundir com o dinheiro da casa',
          'Emitir nota fiscal',
        ],
        correct: 1,
        explanation: 'O imposto do MEI é fixo: separar não muda um centavo dele. O que muda é a informação. Quem mistura acha que vai bem enquanto tem saldo, e descobre que não ia quando o saldo acaba — geralmente no mês em que o faturamento cai.',
      },
    ],
  },

  /* ------------------------------------------------------------- 2 */
  {
    id: 'quanto-sobra',
    shortTitle: 'Quanto sobra',
    kicker: 'MÓDULO 02 · RESULTADO',
    title: 'Quanto sobra de verdade no fim do mês',
    summary: 'Faturamento não é ganho. Entre um e outro tem insumo, imposto, taxa e tudo o que você esquece.',
    content: [
      {
        type: 'paragraph',
        text: 'Pergunte a um MEI quanto ele ganha e ele vai responder o faturamento. É a resposta errada, e é a mais comum. O que você ganha é o que sobra depois de tudo o que a venda consumiu.',
      },
      {
        type: 'table',
        headers: ['A conta da Silvana', 'Valor'],
        rows: [
          ['Faturamento do mês', brl(FAT_S)],
          ['− Ingredientes e embalagem', `− ${brl(CUSTO_S)}`],
          ['− Taxa de maquininha (3%)', `− ${brl(FAT_S * 0.03)}`],
          ['− DAS', `− ${brl(DAS_COMERCIO)}`],
          ['− Gás, energia e transporte', '− R$ 380,00'],
          ['= Sobrou para ela', brl(FAT_S - CUSTO_S - FAT_S * 0.03 - DAS_COMERCIO - 380)],
        ],
        caption: `De ${brl(FAT_S)} faturados, ${brl(FAT_S - CUSTO_S - FAT_S * 0.03 - DAS_COMERCIO - 380)} são dela`,
      },
      {
        type: 'stats',
        items: [
          { value: brl(FAT_S), label: 'faturou', hint: 'o número que ela dizia quando perguntavam' },
          { value: brl(FAT_S - CUSTO_S - FAT_S * 0.03 - DAS_COMERCIO - 380), label: 'sobrou', hint: 'o número que paga a vida dela' },
          { value: `${num(((FAT_S - CUSTO_S - FAT_S * 0.03 - DAS_COMERCIO - 380) / FAT_S) * 100, 0)}%`, label: 'é a margem', hint: 'a distância entre os dois' },
        ],
      },
      {
        type: 'calculator',
        fields: [
          { id: 'faturamento', label: 'Faturamento do mês (R$)', type: 'currency', placeholder: String(FAT_S) },
          { id: 'insumo', label: 'Material, insumo ou mercadoria (R$)', type: 'currency', placeholder: String(CUSTO_S) },
          { id: 'taxaCartao', label: 'Taxa média de maquininha (%)', type: 'percentage', placeholder: '3' },
          { id: 'das', label: 'DAS (R$)', type: 'currency', placeholder: String(DAS_COMERCIO.toFixed(2)) },
          { id: 'fixos', label: 'Outros custos fixos do negócio (R$)', type: 'currency', placeholder: '380' },
        ],
        formula:
          "if (!(faturamento > 0)) { return { aviso: 'Informe quanto você faturou no mês.' }; } const taxa = faturamento * (taxaCartao / 100); const sobra = faturamento - insumo - taxa - das - fixos; const margem = (sobra / faturamento) * 100; const porDia = sobra / 30; const leitura = sobra <= 0 ? 'O mês não se pagou: o problema está no preço ou no custo, não no imposto.' : margem < 20 ? 'Margem apertada: sobra pouco para imprevisto e para você.' : 'Margem saudável para quem trabalha sozinho.'; return { taxa, sobra, margem, porDia, leitura };",
        resultLabel: 'O que sobra para você',
        resultFormat: 'object',
        resultFields: [
          { key: 'taxa', label: 'Ficou com a maquininha', format: 'currency' },
          { key: 'sobra', label: 'Sobrou no mês', format: 'currency' },
          { key: 'margem', label: 'Margem sobre o faturamento', format: 'percentage' },
          { key: 'porDia', label: 'Por dia do mês', format: 'currency' },
          { key: 'leitura', label: 'Leitura', format: 'text' },
        ],
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'OS CUSTOS QUE TODO MEI ESQUECE',
        items: [
          'Taxa da maquininha — some pouco por venda e muito no mês',
          'Combustível e aplicativo de transporte para entregar',
          'Internet e celular, se o negócio depende deles',
          'A depreciação do que você usa: forno, furadeira, computador, moto',
        ],
      },
      {
        type: 'quiz',
        question: `Silvana fatura ${brl(FAT_S)} e diz que "ganha ${brlCheio(5200)} por mês". O que está errado?`,
        options: [
          'Nada, faturamento é ganho',
          `Faturar não é ganhar: depois dos custos sobram ${brl(FAT_S - CUSTO_S - FAT_S * 0.03 - DAS_COMERCIO - 380)}`,
          'Ela devia descontar só o imposto',
        ],
        correct: 1,
        explanation: 'A diferença entre faturar e ganhar é exatamente o que decide se o negócio vale a pena. Quem confunde os dois toma decisões grandes com o número errado — aluga ponto, compra equipamento, contrata.',
      },
    ],
  },

  /* ------------------------------------------------------------- 3 */
  {
    id: 'preco',
    shortTitle: 'O seu preço',
    kicker: 'MÓDULO 03 · PREÇO',
    title: 'Quanto cobrar: começando pelo custo',
    summary: 'Preço não nasce do que o concorrente cobra. Nasce do que custa fazer, mais o que você precisa ganhar.',
    content: [
      {
        type: 'paragraph',
        text: 'A conta de preço mais usada pelo MEI é olhar o concorrente e cobrar um pouco menos. O problema é que o concorrente pode estar errado — e frequentemente está, porque ele fez a mesma coisa olhando um terceiro.',
      },
      { type: 'heading', text: 'A conta que funciona' },
      { type: 'math', expression: 'Pre\\c{c}o = \\frac{Custo\\ direto}{1 - (\\%\\ taxa + \\%\\ margem)}' },
      {
        type: 'paragraph',
        text: 'Custo direto é o que você gasta para fazer aquela unidade: ingrediente, peça, material. Os percentuais são o que sai do preço depois: taxa de cartão e a margem que você quer. Dividir em vez de somar é o detalhe que muda tudo — somar 30% ao custo não te dá 30% de margem.',
      },
      {
        type: 'calculator',
        fields: [
          { id: 'custoDireto', label: 'Custo direto da unidade (R$)', type: 'currency', placeholder: '18' },
          { id: 'taxaCartao', label: 'Taxa de maquininha (%)', type: 'percentage', placeholder: '3' },
          { id: 'margem', label: 'Margem que você quer (%)', type: 'percentage', placeholder: '35' },
        ],
        formula:
          "if (!(custoDireto > 0)) { return { aviso: 'Informe o custo direto de uma unidade.' }; } const saida = (taxaCartao + margem) / 100; if (saida >= 1) { return { aviso: 'Taxa mais margem somam 100% ou mais: não sobra espaço para o custo. Reduza a margem.' }; } const preco = custoDireto / (1 - saida); const markup = preco / custoDireto; const sobraUnidade = preco - custoDireto - preco * (taxaCartao / 100); return { preco, markup, sobraUnidade };",
        resultLabel: 'O seu preço',
        resultFormat: 'object',
        resultFields: [
          { key: 'preco', label: 'Preço de venda', format: 'currency' },
          { key: 'markup', label: 'Multiplicador sobre o custo', format: 'number' },
          { key: 'sobraUnidade', label: 'Sobra por unidade', format: 'currency' },
        ],
      },
      {
        type: 'callout',
        tone: 'danger',
        title: 'O ERRO DE SOMAR EM VEZ DE DIVIDIR',
        items: [
          'Custo de R$ 18 mais 35% dá R$ 24,30 — e a margem real aí, já tirando a taxa, é 23%',
          'Dividindo por (1 − 38%) o preço sai R$ 29,03, e aí sim a margem é a que você queria',
          'A diferença por unidade parece pequena',
          'Em 300 unidades no mês, são mais de R$ 1.400 que ficaram na mesa',
        ],
      },
      { type: 'heading', text: 'E o seu trabalho?' },
      {
        type: 'paragraph',
        text: 'Repare que o custo direto não inclui você. Isso é proposital: o seu trabalho não é custo de uma unidade, é custo do mês inteiro. Ele entra na conta do módulo seguinte — quantas unidades você precisa vender para pagar a sua vida.',
      },
      {
        type: 'quiz',
        question: 'Você quer 40% de margem e a maquininha cobra 3%. Por quanto divide o custo?',
        options: [
          'Por 0,40',
          'Por 0,57 — que é 1 menos 43%, a soma do que sai do preço',
          'Multiplica por 1,43',
        ],
        correct: 1,
        explanation: 'Taxa e margem saem do preço, não entram no custo. Por isso a conta é divisão pelo que sobra: 1 − 0,43 = 0,57. Multiplicar o custo por 1,43 dá um preço menor e uma margem real de 30%, não de 40%.',
      },
    ],
  },

  /* ------------------------------------------------------------- 4 */
  {
    id: 'capacidade',
    shortTitle: 'Quantos por mês',
    kicker: 'MÓDULO 04 · CAPACIDADE',
    title: 'Quantos você precisa vender para pagar a sua vida',
    summary: 'Todo MEI tem um número mágico por mês. Quase nenhum sabe qual é o dele.',
    content: [
      {
        type: 'paragraph',
        text: 'Existe uma quantidade mínima de vendas que paga o custo fixo do negócio e o dinheiro que você precisa tirar para viver. Abaixo dela, você está trabalhando de graça. Saber esse número muda a forma como você aceita ou recusa trabalho.',
      },
      { type: 'math', expression: 'Quantidade = \\frac{Custo\\ fixo + Sua\\ retirada}{Sobra\\ por\\ unidade}' },
      {
        type: 'calculator',
        fields: [
          { id: 'fixo', label: 'Custo fixo do negócio por mês (R$)', type: 'currency', placeholder: '380' },
          { id: 'das', label: 'DAS (R$)', type: 'currency', placeholder: String(DAS_COMERCIO.toFixed(2)) },
          { id: 'retirada', label: 'Quanto você precisa tirar por mês (R$)', type: 'currency', placeholder: '2800' },
          { id: 'sobraUnidade', label: 'Sobra por unidade vendida (R$)', type: 'currency', placeholder: '11' },
        ],
        formula:
          "if (!(sobraUnidade > 0)) { return { aviso: 'Informe quanto sobra em cada unidade vendida, depois do custo e da taxa.' }; } const alvo = fixo + das + retirada; const exatas = alvo / sobraUnidade; const unidades = Math.ceil(exatas); const porSemana = Math.ceil(exatas / 4.3); const porDiaUtil = exatas / 22; return { alvo, unidades, porSemana, porDiaUtil };",
        resultLabel: 'O seu número do mês',
        resultFormat: 'object',
        resultFields: [
          { key: 'alvo', label: 'Precisa gerar por mês', format: 'currency' },
          { key: 'unidades', label: 'Unidades por mês', format: 'number' },
          { key: 'porSemana', label: 'Por semana', format: 'number' },
          { key: 'porDiaUtil', label: 'Por dia útil', format: 'number' },
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'PARA QUE ESSE NÚMERO SERVE',
        items: [
          'Saber se a meta é possível: se dá 40 por dia útil e você faz 12, o problema é o preço, não o esforço',
          'Decidir sobre desconto: baixar 10% no preço pode exigir 25% mais vendas para dar o mesmo',
          'Aceitar ou recusar encomenda grande com prazo apertado, sabendo quanto ela representa do mês',
          'Ver, no meio do mês, se você está no ritmo ou se precisa correr atrás',
        ],
      },
      {
        type: 'highlight',
        text: 'Quem não sabe o número do mês negocia desconto no escuro. Quem sabe, descobre que alguns pedidos custam mais do que rendem.',
      },
      {
        type: 'accordion',
        items: [
          {
            title: 'E se o meu produto não é unidade, é hora?',
            text: 'A conta é a mesma, trocando unidade por hora trabalhada. Custo fixo mais retirada, dividido pelo que sobra em uma hora de serviço. O resultado é quantas horas você precisa vender por mês — e aí vem a surpresa: quase ninguém consegue vender mais que 60% das horas disponíveis, porque orçamento, deslocamento e cobrança também consomem tempo.',
          },
          {
            title: 'Meu número deu mais do que eu consigo produzir. E agora?',
            text: 'Então o preço está baixo. É a conclusão desconfortável e é quase sempre a certa. Aumentar 10% no preço reduz a quantidade necessária em mais de 10%, porque o aumento vai inteiro para a sobra por unidade.',
          },
        ],
      },
      {
        type: 'quiz',
        question: 'Você precisa gerar R$ 3.200 por mês e sobram R$ 11 por unidade. Quantas unidades?',
        options: [
          'Cerca de 160',
          'Cerca de 291 — pouco mais de 13 por dia útil',
          'Cerca de 400',
        ],
        correct: 1,
        explanation: '3.200 dividido por 11 dá 291 unidades. Em 22 dias úteis, são 13,2 por dia. É esse número que você compara com a sua capacidade real — e quando ele não cabe, o ajuste é no preço.',
      },
    ],
  },

  /* ------------------------------------------------------------- 5 */
  {
    id: 'como-se-pagar',
    shortTitle: 'Como se pagar',
    kicker: 'MÓDULO 05 · RETIRADA',
    title: 'Você não tem pró-labore. Então como se paga?',
    summary: 'O MEI é dispensado de pró-labore — e é justamente por isso que tanta gente tira dinheiro sem critério.',
    content: [
      {
        type: 'paragraph',
        text: 'Na ME, o sócio que trabalha é obrigado a ter pró-labore com INSS. No MEI, não: a sua contribuição previdenciária já está dentro do DAS. Você não precisa formalizar salário nenhum. A liberdade é boa e é perigosa: sem uma regra, a retirada vira "o que estiver na conta".',
      },
      {
        type: 'comparison',
        columns: [
          {
            label: 'Tirar pelo saldo',
            tone: 'negative',
            items: [
              'Mês bom, você tira muito e gasta',
              'Mês fraco, você tira o que precisa e some o caixa',
              'O dinheiro do imposto e do fornecedor vai junto',
              'Nunca sobra para equipamento nem para emergência',
            ],
          },
          {
            label: 'Tirar por regra',
            tone: 'positive',
            items: [
              'Um valor fixo por mês, definido pela sua necessidade real',
              'Numa data combinada, como um salário',
              'O que passar disso fica na empresa como reserva',
              'Mês bom banca mês ruim em vez de virar consumo',
            ],
          },
        ],
      },
      { type: 'heading', text: 'Como definir o seu valor' },
      {
        type: 'steps',
        items: [
          { title: 'Some o custo da sua vida por mês', text: 'Aluguel, mercado, escola, transporte, saúde. O valor real, não o desejado.' },
          { title: 'Confira se o negócio banca isso', text: 'Use o número do módulo anterior. Se não banca, o problema é preço ou volume — e não adianta tirar mais.' },
          { title: 'Defina um valor fixo e uma data', text: 'Todo dia 5, por exemplo. Transferência da conta PJ para a pessoal.' },
          { title: 'Revise a cada seis meses', text: 'Se o negócio cresceu e a reserva está formada, aumente. Se encolheu, ajuste antes de consumir o caixa.' },
        ],
      },
      {
        type: 'calculator',
        fields: [
          { id: 'sobraMedia', label: 'Quanto sobra no negócio, em média (R$)', type: 'currency', placeholder: '2482' },
          { id: 'custoVida', label: 'Custo da sua vida por mês (R$)', type: 'currency', placeholder: '2800' },
          { id: 'reservaPct', label: 'Quanto deixar na empresa (%)', type: 'percentage', placeholder: '20' },
        ],
        formula:
          "const guardar = sobraMedia * (reservaPct / 100); const podeTirar = sobraMedia - guardar; const gap = custoVida - podeTirar; const leitura = gap <= 0 ? 'O negócio banca a sua vida e ainda forma reserva.' : 'Falta esse valor todo mês: ou o preço sobe, ou o volume sobe, ou o custo da sua vida desce. Tirar do caixa não resolve.'; return { guardar, podeTirar, gap, leitura };",
        resultLabel: 'A sua retirada',
        resultFormat: 'object',
        resultFields: [
          { key: 'podeTirar', label: 'Dá para tirar por mês', format: 'currency' },
          { key: 'guardar', label: 'Fica na empresa', format: 'currency' },
          { key: 'gap', label: 'Falta para a sua vida', format: 'currency' },
          { key: 'leitura', label: 'Leitura', format: 'text' },
        ],
      },
      {
        type: 'quiz',
        question: 'O mês foi ótimo e sobrou o dobro do normal. O que fazer com a diferença?',
        options: [
          'Tirar tudo, foi você quem trabalhou',
          'Manter a retirada de sempre e deixar a diferença na empresa, para bancar o mês fraco que vem',
          'Antecipar o DAS do ano',
        ],
        correct: 1,
        explanation: 'Retirada fixa é o que transforma um faturamento irregular numa renda previsível. Quem tira o excedente do mês bom fica sem colchão para o mês ruim — e aí volta a misturar as contas para sobreviver.',
      },
    ],
  },

  /* ------------------------------------------------------------- 6 */
  {
    id: 'lucro-isento',
    shortTitle: 'Retirada isenta',
    kicker: 'MÓDULO 06 · IMPOSTO DE RENDA',
    title: 'Até quanto você pode tirar sem pagar IR',
    summary: 'Existe um limite de isenção, ele depende da sua atividade, e quase ninguém sabe que ele existe.',
    content: [
      {
        type: 'paragraph',
        text: 'O lucro que você tira do MEI é isento de imposto de renda — até certo ponto. Sem contabilidade formal, a Receita presume o seu lucro por um percentual da receita bruta. O que passar disso é rendimento tributável na sua declaração de pessoa física.',
      },
      {
        type: 'table',
        headers: ['A sua atividade', 'Percentual presumido', 'Sobre o quê'],
        rows: [
          ['Comércio, indústria', '8%', 'da receita bruta do ano'],
          ['Transporte de carga', '8%', 'da receita bruta do ano'],
          ['Transporte de passageiros', '16%', 'da receita bruta do ano'],
          ['Serviços em geral', '32%', 'da receita bruta do ano'],
        ],
        caption: 'Do valor presumido ainda se subtrai o DAS pago no ano',
      },
      { type: 'math', expression: 'Isento = (Receita\\ bruta \\times \\%\\ presun\\c{c}\\tilde{a}o) - DAS\\ pago\\ no\\ ano' },
      { type: 'heading', text: 'Os nossos dois exemplos' },
      {
        type: 'table',
        headers: ['', 'Silvana (comércio)', 'Rogério (serviço)'],
        rows: [
          ['Receita bruta no ano', brl(FAT_S * 12), brl(FAT_R * 12)],
          ['Percentual presumido', '8%', '32%'],
          ['Lucro presumido', brl(FAT_S * 12 * PRESUNCAO_COMERCIO), brl(FAT_R * 12 * PRESUNCAO_SERVICO)],
          ['− DAS pago no ano', `− ${brl(DAS_COMERCIO * 12)}`, `− ${brl(DAS_SERVICO * 12)}`],
          ['Pode tirar isento no ano', brl(isentoS), brl(isentoR)],
          ['Por mês', brl(isentoS / 12), brl(isentoR / 12)],
        ],
        caption: 'Mesma faixa de faturamento, isenção muito diferente — por causa do percentual da atividade',
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'O QUE ACONTECE COM O QUE PASSA DISSO',
        items: [
          'Não vira irregularidade: vira rendimento tributável na sua declaração de pessoa física',
          'Entra na tabela progressiva do IRPF, junto com os seus outros rendimentos',
          'Se o total do ano ficar abaixo do limite de isenção do IRPF, não há imposto a pagar mesmo assim',
          'Existe uma saída: manter escrituração contábil regular derruba o limite presumido e permite distribuir o lucro real',
        ],
      },
      {
        type: 'calculator',
        fields: [
          { id: 'receitaAno', label: 'Receita bruta do ano (R$)', type: 'currency', placeholder: String(FAT_S * 12) },
          { id: 'atividade', label: 'A sua atividade', type: 'select', options: ['Comércio ou indústria (8%)', 'Serviços (32%)', 'Transporte de passageiros (16%)'] },
          { id: 'dasAno', label: 'DAS pago no ano (R$)', type: 'currency', placeholder: String((DAS_COMERCIO * 12).toFixed(2)) },
          { id: 'retirou', label: 'Quanto você retirou no ano (R$)', type: 'currency', placeholder: '33600' },
        ],
        formula:
          "const pct = atividade === 'Serviços (32%)' ? 0.32 : atividade === 'Transporte de passageiros (16%)' ? 0.16 : 0.08; const presumido = receitaAno * pct; const isento = Math.max(0, presumido - dasAno); const excedente = Math.max(0, retirou - isento); const leitura = excedente === 0 ? 'Toda a sua retirada está dentro da isenção.' : 'O excedente entra como rendimento tributável na sua declaração de pessoa física.'; return { presumido, isento, porMes: isento / 12, excedente, leitura };",
        resultLabel: 'A sua retirada isenta',
        resultFormat: 'object',
        resultFields: [
          { key: 'presumido', label: 'Lucro presumido do ano', format: 'currency' },
          { key: 'isento', label: 'Pode tirar isento no ano', format: 'currency' },
          { key: 'porMes', label: 'Por mês', format: 'currency' },
          { key: 'excedente', label: 'Retirada acima da isenção', format: 'currency' },
          { key: 'leitura', label: 'Leitura', format: 'text' },
        ],
      },
      {
        type: 'quiz',
        question: 'Por que Rogério pode tirar muito mais isento que Silvana, faturando quase o mesmo?',
        options: [
          'Porque serviço paga menos imposto',
          'Porque a presunção de lucro do serviço é 32% e a do comércio é 8%',
          'Porque ele tem mais despesa',
        ],
        correct: 1,
        explanation: 'A presunção reflete a lógica de que comércio compra caro e revende com margem pequena, enquanto serviço tem pouco custo de material. É uma média legal, não a sua realidade — e é por isso que quem tem lucro maior que a presunção pode compensar mantendo contabilidade regular.',
      },
    ],
  },

  /* ------------------------------------------------------------- 7 */
  {
    id: 'irpf',
    shortTitle: 'A sua declaração',
    kicker: 'MÓDULO 07 · IRPF',
    title: 'O MEI e a sua declaração de pessoa física',
    summary: 'São duas declarações diferentes e muita gente entrega só uma. A outra é a que tem multa maior.',
    content: [
      {
        type: 'paragraph',
        text: 'A DASN-SIMEI é a declaração da empresa. A declaração de imposto de renda é sua, pessoa física. Ter MEI não obriga ninguém a declarar IRPF — mas o dinheiro que sai da empresa entra nas regras de obrigatoriedade como qualquer outro rendimento.',
      },
      {
        type: 'comparison',
        columns: [
          {
            label: 'DASN-SIMEI',
            tone: 'neutral',
            items: [
              'É da empresa, pelo CNPJ',
              'Informa o faturamento do ano',
              'Prazo: 31 de maio',
              'Obrigatória sempre, mesmo faturando zero',
            ],
          },
          {
            label: 'Declaração de IRPF',
            tone: 'neutral',
            items: [
              'É sua, pelo CPF',
              'Informa o que você recebeu no ano',
              'Prazo: normalmente até 31 de maio',
              'Obrigatória só se você se enquadrar nas regras',
            ],
          },
        ],
      },
      { type: 'heading', text: 'Como o dinheiro do MEI entra na sua declaração' },
      {
        type: 'steps',
        items: [
          { title: 'O lucro isento vai em "Rendimentos Isentos e Não Tributáveis"', text: 'Na linha de lucros distribuídos, informando o CNPJ da sua empresa como fonte pagadora.' },
          { title: 'O que passou da presunção vai em "Rendimentos Tributáveis"', text: 'Recebidos de pessoa jurídica, sujeitos à tabela progressiva.' },
          { title: 'O CNPJ vai na ficha de "Bens e Direitos"', text: 'O capital social do MEI é declarado como participação em empresa.' },
          { title: 'Guarde o relatório mensal e a DASN', text: 'São eles que sustentam os valores que você declarou, se houver questionamento.' },
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'QUANDO O MEI É OBRIGADO A DECLARAR IRPF',
        items: [
          'Quando os rendimentos tributáveis do ano passam do limite definido pela Receita',
          'Quando os rendimentos isentos somam acima do limite próprio deles',
          'Quando você tem bens acima de determinado valor em 31 de dezembro',
          'Os valores-limite mudam todo ano: confira na instrução normativa da temporada',
        ],
      },
      {
        type: 'highlight',
        text: 'Declarar o lucro isento não custa imposto e constrói o seu histórico de renda. É o que permite financiar imóvel, alugar sem fiador e provar que a sua atividade existe.',
      },
      {
        type: 'accordion',
        items: [
          {
            title: 'Sou MEI e não tenho outra renda. Preciso declarar?',
            text: 'Depende dos valores. Se o seu lucro isento for alto o bastante para cruzar o limite dos rendimentos isentos, sim. Muitos MEIs ficam abaixo e não são obrigados — mas declarar mesmo assim costuma valer pela comprovação de renda.',
          },
          {
            title: 'Sou CLT e também MEI. Como declaro?',
            text: 'Uma declaração só, com as duas fontes. O salário vai em rendimentos tributáveis com o informe da empresa; o lucro do MEI vai em isentos, até a presunção. São fichas diferentes na mesma declaração.',
          },
          {
            title: 'Esqueci de declarar o lucro do MEI em anos anteriores. Dá para corrigir?',
            text: 'Dá, por declaração retificadora, e o prazo é de cinco anos. Corrigir espontaneamente é sempre melhor que esperar a malha fina — ali a multa é maior e a discussão, mais difícil.',
          },
        ],
      },
      {
        type: 'quiz',
        question: 'Entregar a DASN-SIMEI dispensa você de declarar o imposto de renda?',
        options: [
          'Sim, uma cobre a outra',
          'Não: uma é da empresa e a outra é sua — as regras de obrigatoriedade são independentes',
          'Sim, se o faturamento for baixo',
        ],
        correct: 1,
        explanation: 'São declarações de contribuintes diferentes: uma do CNPJ, outra do CPF. É comum o MEI entregar a DASN certinho e nunca ter declarado IRPF, mesmo estando obrigado — e descobrir na hora de pedir financiamento.',
      },
    ],
  },

  /* ------------------------------------------------------------- 8 */
  {
    id: 'beneficios',
    shortTitle: 'O que os 5% dão',
    kicker: 'MÓDULO 08 · INSS',
    title: `O que os ${brl(INSS_MEI)} do DAS compram`,
    summary: 'A maior parte do seu imposto não é imposto: é seguro. Vale saber o que ele cobre e a partir de quando.',
    content: [
      {
        type: 'paragraph',
        text: `De cada DAS que você paga, ${brl(INSS_MEI)} são contribuição previdenciária — 5% do salário mínimo. É a menor alíquota que existe no INSS, e ela dá acesso a um conjunto de benefícios que muita gente não sabe que tem.`,
      },
      {
        type: 'table',
        headers: ['Benefício', 'Carência', 'Quem recebe'],
        rows: [
          ['Aposentadoria por idade (mulher)', '180 contribuições', 'A partir dos 62 anos'],
          ['Aposentadoria por idade (homem)', '180 ou 240 contribuições', 'A partir dos 65 anos'],
          ['Auxílio por incapacidade temporária', '12 contribuições', 'Você, se ficar incapaz de trabalhar'],
          ['Aposentadoria por incapacidade permanente', '12 contribuições', 'Você, se a incapacidade for definitiva'],
          ['Salário-maternidade', '10 contribuições', 'A segurada'],
          ['Pensão por morte', 'Sem carência', 'Os seus dependentes'],
          ['Auxílio-reclusão', '24 contribuições', 'Os seus dependentes'],
        ],
        caption: 'Homem que se filiou ao INSS a partir de 2020 precisa de 240 contribuições, não 180',
      },
      {
        type: 'callout',
        tone: 'danger',
        title: 'DOIS DETALHES QUE MUDAM TUDO',
        items: [
          'Acidente não tem carência: a cobertura vale desde a primeira contribuição',
          'Mês em atraso não conta carência — e é esse o custo real de atrasar o DAS',
          'Depois de parar de pagar, você mantém a qualidade de segurado por 12 meses (o "período de graça")',
          'Passado esse prazo, a carência começa a ser recontada em parte',
        ],
      },
      {
        type: 'highlight',
        text: `${brl(INSS_MEI)} por mês é menos que um plano de celular. Só que esse cobre afastamento por doença, maternidade e pensão para a sua família.`,
      },
      {
        type: 'calculator',
        fields: [
          { id: 'mesesPagos', label: 'Quantos DAS você já pagou', type: 'number', placeholder: '14' },
          { id: 'caso', label: 'O seu caso', type: 'select', options: ['Mulher', 'Homem filiado ao INSS até 2019', 'Homem filiado a partir de 2020'] },
        ],
        formula:
          "if (!(mesesPagos >= 0)) { return { aviso: 'Informe quantos DAS você já pagou.' }; } const exigido = caso === 'Homem filiado a partir de 2020' ? 240 : 180; const auxilio = Math.max(0, 12 - mesesPagos); const maternidade = Math.max(0, 10 - mesesPagos); const aposentadoria = Math.max(0, exigido - mesesPagos); const leitura = mesesPagos >= 12 ? 'Você já tem carência para auxílio por incapacidade e para salário-maternidade.' : 'Ainda em carência para os benefícios por incapacidade. Acidente, porém, já está coberto desde a primeira contribuição.'; return { auxilio, maternidade, aposentadoria, anosAposentadoria: aposentadoria / 12, leitura };",
        resultLabel: 'Onde você está',
        resultFormat: 'object',
        resultFields: [
          { key: 'auxilio', label: 'Faltam para auxílio-doença (meses)', format: 'number' },
          { key: 'maternidade', label: 'Faltam para salário-maternidade (meses)', format: 'number' },
          { key: 'aposentadoria', label: 'Faltam para aposentadoria (meses)', format: 'number' },
          { key: 'anosAposentadoria', label: 'Ou, em anos', format: 'number' },
          { key: 'leitura', label: 'Leitura', format: 'text' },
        ],
      },
      {
        type: 'quiz',
        question: 'Você paga o DAS há 8 meses e sofre um acidente de trabalho. Tem direito ao auxílio?',
        options: [
          'Não, a carência é de 12 meses',
          'Tem — benefício decorrente de acidente é isento de carência',
          'Só depois de 12 meses de contribuição',
        ],
        correct: 1,
        explanation: 'A carência de 12 meses vale para doença. Para acidente, de qualquer natureza, não há carência: basta ter a qualidade de segurado. É uma das regras mais desconhecidas e uma das mais úteis para quem começou há pouco.',
      },
    ],
  },

  /* ------------------------------------------------------------- 9 */
  {
    id: 'aposentadoria',
    shortTitle: 'Aposentadoria',
    kicker: 'MÓDULO 09 · FUTURO',
    title: 'A aposentadoria do MEI é de um salário mínimo',
    summary: 'É o que os 5% compram. Se você quer mais que isso, existe um caminho — e ele custa 15% a mais.',
    content: [
      {
        type: 'paragraph',
        text: 'A conta do INSS é direta: você contribui sobre um salário mínimo, então se aposenta com um salário mínimo. Não importa se você fatura o teto do MEI todo ano. A contribuição é fixa e o benefício acompanha.',
      },
      {
        type: 'comparison',
        columns: [
          {
            label: `Só o DAS — ${brl(INSS_MEI)}/mês`,
            tone: 'neutral',
            items: [
              'Aposentadoria por idade: 65 anos (homem) ou 62 (mulher)',
              'Valor: um salário mínimo',
              'Não dá direito a aposentadoria por tempo de contribuição',
              'É o piso, e para muita gente é suficiente',
            ],
          },
          {
            label: `Com o complemento de 15%`,
            tone: 'positive',
            items: [
              `Mais ${brl(SALARIO_MINIMO * 0.15)} por mês, na guia GPS código 1910`,
              'O tempo passa a contar para aposentadoria por tempo de contribuição',
              'Permite somar com períodos de carteira assinada',
              'Vale para quem já tem anos de CLT nas costas',
            ],
          },
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'QUANDO O COMPLEMENTO DE 15% COMPENSA',
        items: [
          'Quando você já tem muitos anos de carteira assinada e quer somar os períodos',
          'Quando falta pouco para completar o tempo de contribuição da regra de transição',
          'Quando você quer se aposentar antes da idade mínima da aposentadoria por idade',
          'Não compensa se o seu plano já é se aposentar por idade com um salário mínimo',
        ],
      },
      {
        type: 'calculator',
        fields: [
          { id: 'salario', label: 'Salário mínimo vigente (R$)', type: 'currency', placeholder: String(SALARIO_MINIMO) },
          { id: 'anos', label: 'Por quantos anos você ainda vai contribuir', type: 'number', placeholder: '20' },
        ],
        formula:
          "if (!(salario > 0)) { return { aviso: 'Informe o salário mínimo em vigor.' }; } const base = salario * 0.05; const complemento = salario * 0.15; const totalMes = base + complemento; const noAno = complemento * 12; const noPeriodo = complemento * 12 * anos; return { base, complemento, totalMes, noAno, noPeriodo };",
        resultLabel: 'O custo de contar tempo de contribuição',
        resultFormat: 'object',
        resultFields: [
          { key: 'base', label: 'O que você já paga no DAS', format: 'currency' },
          { key: 'complemento', label: 'Complemento de 15% por mês', format: 'currency' },
          { key: 'totalMes', label: 'Total de INSS por mês', format: 'currency' },
          { key: 'noAno', label: 'Complemento no ano', format: 'currency' },
          { key: 'noPeriodo', label: 'Complemento no período todo', format: 'currency' },
        ],
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'O QUE NENHUM DOS DOIS CAMINHOS RESOLVE',
        items: [
          'Nem com complemento a sua aposentadoria pelo MEI passa de um salário mínimo de base',
          'O complemento muda o tipo de aposentadoria e o tempo, não o valor do benefício do MEI',
          'Quem quer renda maior na velhice precisa poupar por fora — previdência privada ou investimento',
          'Trate o INSS como piso de segurança, não como plano de aposentadoria',
        ],
      },
      {
        type: 'highlight',
        text: 'O DAS garante que você não fique sem nada. O que vai além disso é poupança sua — e começar cedo vale mais que qualquer escolha de produto.',
      },
      {
        type: 'quiz',
        question: 'Você fatura o teto do MEI todo ano há dez anos. Isso aumenta a sua aposentadoria?',
        options: [
          'Aumenta, a Receita cruza o faturamento',
          'Não: a contribuição é fixa sobre o salário mínimo, então o benefício também é',
          'Aumenta proporcionalmente',
        ],
        correct: 1,
        explanation: 'É a maior surpresa dos MEIs que faturam bem. Faturamento alto e contribuição mínima significam benefício mínimo. Se a sua renda hoje é bem maior que um salário mínimo, a diferença precisa ser poupada por você.',
      },
    ],
  },

  /* ------------------------------------------------------------- 10 */
  {
    id: 'reserva',
    shortTitle: 'A sua reserva',
    kicker: 'MÓDULO 10 · RESERVA',
    title: 'Você não tem 13º, férias nem FGTS',
    summary: 'Tudo o que a CLT dá automaticamente, o MEI precisa construir sozinho. E dá para calcular quanto.',
    content: [
      {
        type: 'paragraph',
        text: 'Quem tem carteira assinada recebe treze salários por ano, tira trinta dias de férias pagas com um terço a mais e acumula FGTS sem fazer nada. O MEI não tem nada disso. A boa notícia é que dá para reproduzir — a conta é conhecida e a parcela é menor do que parece.',
      },
      {
        type: 'table',
        headers: ['O que a CLT dá', 'Quanto vale por mês', 'Como o MEI reproduz'],
        rows: [
          ['13º salário', '8,3% da renda', 'Guardar 8,3% todo mês'],
          ['Férias + 1/3', '11,1% da renda', 'Guardar para parar 30 dias sem perder renda'],
          ['FGTS', '8% da renda', 'Poupança de emergência'],
          ['Total', '27,4% da renda', 'É o que separa o MEI do empregado'],
        ],
        caption: 'Não é luxo: é o custo de não ter empregador',
      },
      {
        type: 'calculator',
        fields: [
          { id: 'retirada', label: 'Quanto você tira por mês (R$)', type: 'currency', placeholder: '2800' },
          { id: 'custoFixoNegocio', label: 'Custo fixo do negócio por mês (R$)', type: 'currency', placeholder: '380' },
          { id: 'jaTem', label: 'Quanto você já tem guardado (R$)', type: 'currency', placeholder: '1500' },
        ],
        formula:
          "const decimo = retirada * 0.0833; const ferias = retirada * 0.1111; const porMes = decimo + ferias; const emergencia = (retirada + custoFixoNegocio) * 4; const falta = Math.max(0, emergencia - jaTem); const mesesPara = porMes > 0 ? falta / porMes : 0; const leitura = falta <= 0 ? 'A sua reserva já cobre quatro meses de parada. Daqui para a frente, o que guardar é investimento.' : 'Guardando essa parcela todo mês, você chega lá no prazo estimado.'; return { decimo, ferias, porMes, emergencia, falta, mesesPara, leitura };",
        resultLabel: 'A sua reserva',
        resultFormat: 'object',
        resultFields: [
          { key: 'decimo', label: 'Seu 13º, por mês', format: 'currency' },
          { key: 'ferias', label: 'Suas férias, por mês', format: 'currency' },
          { key: 'porMes', label: 'Guardar por mês', format: 'currency' },
          { key: 'emergencia', label: 'Reserva de emergência ideal', format: 'currency' },
          { key: 'falta', label: 'Falta guardar', format: 'currency' },
          { key: 'mesesPara', label: 'Meses para chegar lá', format: 'number' },
          { key: 'leitura', label: 'Leitura', format: 'text' },
        ],
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'POR QUE QUATRO MESES E NÃO UM',
        items: [
          'O MEI não tem seguro-desemprego nem aviso prévio',
          'Se você adoecer, o auxílio do INSS demora a sair e exige carência',
          'Se perder o cliente principal, reconstruir carteira leva meses',
          'Quatro meses de custo de vida mais custo fixo do negócio é o mínimo confortável',
        ],
      },
      {
        type: 'highlight',
        text: 'A diferença entre um MEI tranquilo e um MEI sufocado quase nunca é o faturamento. É ter ou não ter quatro meses guardados.',
      },
      {
        type: 'quiz',
        question: 'Você tira R$ 2.800 por mês. Quanto deveria guardar para reproduzir 13º e férias?',
        options: [
          'Cerca de R$ 150',
          'Cerca de R$ 544 — 8,3% para o 13º e 11,1% para as férias',
          'Cerca de R$ 1.000',
        ],
        correct: 1,
        explanation: 'São R$ 233 de 13º e R$ 311 de férias por mês. Parece muito de uma vez, mas é exatamente o que o seu antigo empregador guardava sem você ver. A diferença é que agora a conta é sua.',
      },
    ],
  },

  /* ------------------------------------------------------------- 11 */
  {
    id: 'seu-numero',
    shortTitle: 'Seu diagnóstico',
    kicker: 'MÓDULO 11 · DESAFIO FINAL',
    title: 'O diagnóstico do seu dinheiro',
    summary: 'Tudo o que você viu, aplicado aos seus números, de uma vez só.',
    content: [
      {
        type: 'paragraph',
        text: 'Preencha com os seus números reais. Em uma tela você vê quanto o negócio gera, quanto dá para tirar, quanto guardar e se o que sobra banca a sua vida.',
      },
      {
        type: 'calculator',
        fields: [
          { id: 'faturamento', label: 'Faturamento do mês (R$)', type: 'currency', placeholder: String(FAT_S) },
          { id: 'insumo', label: 'Insumo, material ou mercadoria (R$)', type: 'currency', placeholder: String(CUSTO_S) },
          { id: 'taxaCartao', label: 'Taxa média de maquininha (%)', type: 'percentage', placeholder: '3' },
          { id: 'fixos', label: 'Custos fixos do negócio (R$)', type: 'currency', placeholder: '380' },
          { id: 'das', label: 'DAS (R$)', type: 'currency', placeholder: String(DAS_COMERCIO.toFixed(2)) },
          { id: 'custoVida', label: 'Custo da sua vida por mês (R$)', type: 'currency', placeholder: '2800' },
        ],
        formula:
          `if (!(faturamento > 0)) { return { aviso: 'Informe quanto você faturou no mês.' }; } const gera = faturamento - insumo - faturamento * (taxaCartao / 100) - fixos - das; const margem = (gera / faturamento) * 100; const guardar = custoVida * 0.194; const podeTirar = gera - guardar; const folga = podeTirar - custoVida; const anual = faturamento * 12; const limite = ${LIMITE}; let leitura; if (gera <= 0) { leitura = 'O negócio não se paga: antes de qualquer coisa, refaça o preço no módulo 3.'; } else if (folga < 0) { leitura = 'O que sobra não banca a sua vida mais a reserva. O ajuste é em preço ou em volume, não em tirar mais.'; } else if (anual > limite) { leitura = 'Sobra o suficiente, mas o seu faturamento anual passa do limite do MEI. Veja o curso 2 desta série.'; } else { leitura = 'Negócio bancando a sua vida, formando reserva e dentro do limite do MEI.'; } return { gera, margem, guardar, podeTirar, folga, anual, leitura };`,
        resultLabel: 'O seu diagnóstico',
        resultFormat: 'object',
        resultFields: [
          { key: 'gera', label: 'O negócio gera por mês', format: 'currency' },
          { key: 'margem', label: 'Margem sobre o faturamento', format: 'percentage' },
          { key: 'guardar', label: 'Guardar (13º, férias e reserva)', format: 'currency' },
          { key: 'podeTirar', label: 'Dá para tirar por mês', format: 'currency' },
          { key: 'folga', label: 'Folga sobre o custo da sua vida', format: 'currency' },
          { key: 'anual', label: 'Faturamento projetado do ano', format: 'currency' },
          { key: 'leitura', label: 'Leitura', format: 'text' },
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'COMO LER O SEU RESULTADO',
        items: [
          'Margem abaixo de 20%: o preço está baixo para o custo que você tem',
          'Folga negativa: o negócio ainda não sustenta você — e tirar mais só adia o problema',
          'Folga positiva e reserva formada: é a hora de pensar em crescer, não antes',
          'Faturamento anual acima do limite: o curso 2 desta série é o seu próximo passo',
        ],
      },
      { type: 'heading', text: 'O seu plano, em ordem de impacto' },
      {
        type: 'steps',
        items: [
          { title: 'Separe as contas nesta semana', text: 'É de graça, leva uma tarde e é o que torna todo o resto possível.' },
          { title: 'Refaça o preço de um produto só', text: 'Pegue o que você mais vende e aplique a conta do módulo 3. Se o preço novo assustar, é porque o atual estava errado.' },
          { title: 'Defina a sua retirada e a data', text: 'Valor fixo, dia fixo. Deixe o excedente na empresa.' },
          { title: 'Comece a reserva com qualquer valor', text: 'Mesmo R$ 100 por mês. O hábito importa mais que o valor no começo.' },
          { title: 'Confira o seu CNIS uma vez por ano', text: 'É onde você vê se todos os DAS entraram como contribuição. Erro ali só aparece quando você precisa do benefício.' },
        ],
      },
      {
        type: 'checklist',
        items: [
          'Conta PJ aberta e separada da pessoal',
          'Preço refeito pela conta de divisão, não de soma',
          'Número de vendas por mês calculado e comparado com a sua capacidade',
          'Retirada definida em valor fixo, com data',
          'Retirada dentro do limite de isenção da sua atividade',
          'Reserva de emergência em construção',
          'Extrato do CNIS conferido no último ano',
        ],
      },
      {
        type: 'highlight',
        text: 'O MEI é o regime mais barato do país. O que decide se o seu negócio dá certo não é o imposto — é o preço, a separação das contas e a reserva.',
      },
      {
        type: 'accordion',
        items: [
          {
            title: 'Qual a relação deste curso com os outros da série?',
            text: 'O curso 1 mostra como manter o MEI em dia, o curso 2 mostra até onde o limite vai, e este mostra o dinheiro. Se você chegou aqui e descobriu que o preço está baixo, comece por ele: preço errado não se conserta com volume nem com regime tributário.',
          },
          {
            title: 'Vale mais a pena aumentar preço ou vender mais?',
            text: 'Aumentar preço, quase sempre. Cada real de aumento vai inteiro para a sobra; cada venda a mais traz junto o custo do insumo. Um aumento de 10% no preço costuma valer mais que 20% de aumento em volume — e não exige trabalhar mais.',
          },
          {
            title: 'Estou no vermelho. Por onde começo?',
            text: 'Pela ordem: primeiro o preço, depois o custo do insumo, depois o volume. Cortar custo fixo costuma ser o menor dos três ganhos, e é por onde a maioria começa. O imposto, no MEI, é o último lugar para procurar dinheiro: ele já é quase nada.',
          },
        ],
      },
    ],
  },
];

grava('mei-dinheiro.json', {
  slug: 'mei-dinheiro',
  courseName: 'O Dinheiro do MEI: Preço, Retirada e Aposentadoria',
  description:
    'Quanto cobrar, quanto sobra de verdade e quanto dá para tirar para você. Separe as contas, refaça o preço pela conta certa, descubra o limite da retirada isenta de imposto de renda e entenda o que os 5% do DAS compram em aposentadoria e benefícios.',
  category: 'MEI sem Sufoco',
  leadCapture: 'end',
  modules,
});
