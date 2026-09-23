import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Faixa horizontal de cursos de uma série.
 *
 * O ponto da faixa é o card seguinte aparecer pela metade na borda da tela: é
 * isso que conta para o visitante que a série tem mais de um curso, antes
 * mesmo de qualquer animação. A rolagem automática reforça o recado, e por
 * isso ela é deliberadamente tímida:
 *
 *  - só roda quando o conteúdo de fato transborda (2+ cards sem caber);
 *  - para assim que a pessoa toca, arrasta, passa o mouse ou foca um card, e
 *    só volta depois de RETOMA_MS parada;
 *  - não roda com a seção fora da tela nem com "reduzir movimento" ligado.
 *
 * Nada aqui depende de biblioteca: é scroll nativo com scroll-snap, então o
 * arrasto do dedo continua sendo o do sistema.
 */

const INTERVALO_MS = 4000;
const RETOMA_MS = 8000;

type Props = { children: React.ReactNode; rotulo: string };

export default function SerieCarrossel({ children, rotulo }: Props) {
  const cards = React.Children.toArray(children);
  const faixaRef = useRef<HTMLDivElement>(null);
  const pausadoAte = useRef(0);
  const sentido = useRef<1 | -1>(1);
  const [visivel, setVisivel] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [transborda, setTransborda] = useState(false);

  const pausa = useCallback(() => {
    pausadoAte.current = Date.now() + RETOMA_MS;
  }, []);

  /**
   * scrollLeft que deixa cada card encostado no início da faixa. Desconta o
   * scroll-padding para o primeiro card parar em 0 e manter a margem da
   * página — sem isso ele encostaria na borda da tela ao voltar ao começo.
   */
  const posicoes = useCallback(() => {
    const faixa = faixaRef.current;
    if (!faixa) return [];
    const recuo = parseFloat(getComputedStyle(faixa).scrollPaddingLeft) || 0;
    const origem = faixa.getBoundingClientRect().left - faixa.scrollLeft;
    return Array.from(faixa.children).map(
      (card) => (card as HTMLElement).getBoundingClientRect().left - origem - recuo
    );
  }, []);

  const vaiPara = useCallback(
    (indice: number) => {
      const faixa = faixaRef.current;
      const alvo = posicoes()[indice];
      if (!faixa || alvo === undefined) return;
      faixa.scrollTo({ left: alvo, behavior: 'smooth' });
    },
    [posicoes]
  );

  // Só faz sentido animar (e mostrar setas) quando os cards não cabem.
  useEffect(() => {
    const faixa = faixaRef.current;
    if (!faixa) return;
    const mede = () => setTransborda(faixa.scrollWidth > faixa.clientWidth + 8);
    mede();
    const observer = new ResizeObserver(mede);
    observer.observe(faixa);
    return () => observer.disconnect();
  }, [cards.length]);

  // Animar uma seção fora da tela é gasto de bateria sem ninguém olhando.
  useEffect(() => {
    const faixa = faixaRef.current;
    if (!faixa) return;
    const observer = new IntersectionObserver(
      ([entrada]) => setVisivel(entrada.isIntersecting),
      { threshold: 0.35 }
    );
    observer.observe(faixa);
    return () => observer.disconnect();
  }, []);

  // Card ativo (pontinhos): o mais próximo do início visível da faixa.
  useEffect(() => {
    const faixa = faixaRef.current;
    if (!faixa) return;
    let pendente = 0;
    const aoRolar = () => {
      cancelAnimationFrame(pendente);
      pendente = requestAnimationFrame(() => {
        const lista = posicoes();
        let maisProximo = 0;
        for (let i = 0; i < lista.length; i++) {
          if (Math.abs(lista[i] - faixa.scrollLeft) < Math.abs(lista[maisProximo] - faixa.scrollLeft)) {
            maisProximo = i;
          }
        }
        setAtivo(maisProximo);
      });
    };
    faixa.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      faixa.removeEventListener('scroll', aoRolar);
      cancelAnimationFrame(pendente);
    };
  }, [posicoes]);

  // A rolagem automática em si.
  useEffect(() => {
    if (!transborda || !visivel || cards.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const faixa = faixaRef.current;
    if (!faixa) return;

    const timer = window.setInterval(() => {
      if (Date.now() < pausadoAte.current) return;

      const lista = posicoes();
      const max = faixa.scrollWidth - faixa.clientWidth;
      const atual = faixa.scrollLeft;
      const vizinho = () =>
        sentido.current === 1
          ? lista.find((p) => p > atual + 8)
          : [...lista].reverse().find((p) => p < atual - 8);

      // No fim da faixa a rolagem inverte em vez de voltar tudo de uma vez:
      // numa série longa, o pulo do último card para o primeiro é um susto.
      let alvo = vizinho();
      if (alvo === undefined || (sentido.current === 1 && atual >= max - 8)) {
        sentido.current = sentido.current === 1 ? -1 : 1;
        alvo = vizinho();
      }
      if (alvo === undefined) return;

      faixa.scrollTo({ left: Math.min(alvo, max), behavior: 'smooth' });
    }, INTERVALO_MS);

    return () => window.clearInterval(timer);
  }, [transborda, visivel, cards.length, posicoes]);

  const seta = (direcao: -1 | 1) => (
    <button
      type="button"
      aria-label={direcao === -1 ? 'Curso anterior' : 'Próximo curso'}
      onClick={() => {
        pausa();
        vaiPara(Math.min(cards.length - 1, Math.max(0, ativo + direcao)));
      }}
      disabled={direcao === -1 ? ativo === 0 : ativo >= cards.length - 1}
      className="hidden md:flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition-colors hover:border-primary/50 disabled:opacity-30 disabled:hover:border-border"
    >
      {direcao === -1 ? '←' : '→'}
    </button>
  );

  return (
    <div
      onPointerDown={pausa}
      onWheel={pausa}
      onMouseEnter={pausa}
      onFocusCapture={pausa}
    >
      <div
        ref={faixaRef}
        role="group"
        aria-roledescription="carrossel"
        aria-label={rotulo}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-pl-4 px-4 pb-2 sm:-mx-5 sm:gap-6 sm:scroll-pl-5 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card, i) => (
          <div
            key={i}
            className="w-[82vw] max-w-[330px] shrink-0 snap-start sm:w-[330px]"
          >
            {card}
          </div>
        ))}
      </div>

      {transborda && (
        <div className="mt-4 flex items-center gap-3">
          {seta(-1)}
          <div className="flex flex-1 items-center gap-2">
            {cards.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para o curso ${i + 1} de ${cards.length}`}
                aria-current={i === ativo}
                onClick={() => {
                  pausa();
                  vaiPara(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === ativo ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-primary/40'
                }`}
              />
            ))}
          </div>
          {seta(1)}
        </div>
      )}
    </div>
  );
}
