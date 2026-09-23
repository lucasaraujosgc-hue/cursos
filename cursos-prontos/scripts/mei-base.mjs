import fs from 'fs';

/*
 * Valores oficiais que a série do MEI usa.
 *
 * TODO ANO ISSO MUDA. O salário mínimo é reajustado em janeiro, e o DAS anda
 * junto porque é 5% dele. Trocar os números AQUI e rodar os três build-mei-*
 * de novo atualiza a série inteira: nenhum valor está escrito à mão no texto.
 *
 * Confira antes de publicar:
 *   SALARIO_MINIMO — portaria de reajuste de janeiro
 *   LIMITE         — art. 18-A da LC 123; há projetos para elevá-lo
 */

export const SALARIO_MINIMO = 1621;
export const LIMITE = 81000;
export const LIMITE_CAMINHONEIRO = 251600;

/** ICMS do comércio e da indústria; ISS dos serviços. Valores fixos em lei. */
export const ICMS = 1;
export const ISS = 5;

export const INSS_MEI = SALARIO_MINIMO * 0.05;
export const DAS_COMERCIO = INSS_MEI + ICMS;
export const DAS_SERVICO = INSS_MEI + ISS;
export const DAS_MISTO = INSS_MEI + ICMS + ISS;

export const LIMITE_MES = LIMITE / 12;
export const TOLERANCIA = LIMITE * 1.2;

/** R$ 1.234,50 */
export const brl = (n) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** R$ 1.234 — para valores redondos, sem centavos pendurados no texto. */
export const brlCheio = (n) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const num = (n, casas = 0) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Escreve o curso e imprime o resumo que os outros scripts esperam. */
export function grava(arquivo, curso) {
  const tam = curso.modules.map((m) => JSON.stringify(m.content).length);
  fs.writeFileSync(arquivo, JSON.stringify(curso, null, 2), 'utf-8');
  console.log(
    `${arquivo}  ${curso.modules.length} módulos | maior ${Math.max(...tam)} | média ${Math.round(
      tam.reduce((a, b) => a + b) / tam.length
    )}`
  );
}

/* ---------------------------------------------------------------------- *
 * Reforma tributária (EC 132/2023 + LC 214/2025)
 *
 * TUDO AQUI ESTÁ EM TRANSIÇÃO. As alíquotas de referência só são fixadas por
 * resolução do Senado, e o cronograma pode ser alterado por lei. Conferir
 * antes de publicar e a cada virada de ano.
 * ---------------------------------------------------------------------- */

export const ANO_TESTE = 2026;
export const CBS_TESTE = 0.9;
export const IBS_TESTE = 0.1;

export const ANO_CBS = 2027;
export const ANO_IBS_INICIO = 2029;
export const ANO_IBS_PLENO = 2033;

/** Teto da soma das alíquotas de referência de IBS e CBS previsto na LC 214. */
export const ALIQUOTA_TETO = 26.5;
