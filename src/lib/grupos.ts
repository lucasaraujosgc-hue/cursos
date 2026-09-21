/**
 * Agrupamento dos cursos por série.
 *
 * A ordem é sempre a ordem do array que vem do servidor — dentro da série e
 * entre as séries, que aparecem na ordem do seu primeiro curso. Assim o que o
 * painel mostra é exatamente o que o visitante vê, e reordenar o array é a
 * única coisa que muda posição.
 */

export const SEM_SERIE = 'Outros cursos';

export type ComCategoria = { category?: string };

export type Grupo<T> = { nome: string; cursos: T[] };

export function agrupaPorSerie<T extends ComCategoria>(cursos: T[]): Grupo<T>[] {
  const grupos: Grupo<T>[] = [];
  const porNome = new Map<string, Grupo<T>>();

  for (const curso of cursos) {
    const nome = (curso.category || '').trim() || SEM_SERIE;
    let grupo = porNome.get(nome);
    if (!grupo) {
      grupo = { nome, cursos: [] };
      porNome.set(nome, grupo);
      grupos.push(grupo);
    }
    grupo.cursos.push(curso);
  }

  // "Outros cursos" é o balaio de quem não tem série: fecha a lista.
  const sobras = grupos.findIndex((g) => g.nome === SEM_SERIE);
  if (sobras !== -1 && sobras !== grupos.length - 1) {
    grupos.push(grupos.splice(sobras, 1)[0]);
  }

  return grupos;
}

/** Nomes de série já em uso, para sugerir no campo do painel. */
export function seriesExistentes<T extends ComCategoria>(cursos: T[]): string[] {
  const nomes = new Set<string>();
  for (const c of cursos) {
    const nome = (c.category || '').trim();
    if (nome) nomes.add(nome);
  }
  return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Move um curso uma posição para cima ou para baixo DENTRO da sua série, e
 * devolve a lista inteira reordenada. Mover entre séries é feito trocando a
 * série do curso, não arrastando.
 */
export function moveCursoNaSerie<T extends ComCategoria & { slug: string }>(
  cursos: T[],
  slug: string,
  direcao: -1 | 1
): T[] {
  const alvo = cursos.find((c) => c.slug === slug);
  if (!alvo) return cursos;

  const serie = (alvo.category || '').trim();
  const mesmaSerie = (c: T) => (c.category || '').trim() === serie;

  const posicoes = cursos.map((c, i) => ({ c, i })).filter(({ c }) => mesmaSerie(c));
  const atual = posicoes.findIndex(({ c }) => c.slug === slug);
  const vizinho = atual + direcao;
  if (atual === -1 || vizinho < 0 || vizinho >= posicoes.length) return cursos;

  const copia = [...cursos];
  const a = posicoes[atual].i;
  const b = posicoes[vizinho].i;
  [copia[a], copia[b]] = [copia[b], copia[a]];
  return copia;
}

/** Move uma série inteira (todos os seus cursos) acima ou abaixo da vizinha. */
export function moveSerie<T extends ComCategoria>(
  cursos: T[],
  nomeSerie: string,
  direcao: -1 | 1
): T[] {
  const grupos = agrupaPorSerie(cursos);
  const atual = grupos.findIndex((g) => g.nome === nomeSerie);
  const vizinho = atual + direcao;
  if (atual === -1 || vizinho < 0 || vizinho >= grupos.length) return cursos;

  [grupos[atual], grupos[vizinho]] = [grupos[vizinho], grupos[atual]];
  return grupos.flatMap((g) => g.cursos);
}
