import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { BlockRenderer } from '../components/CourseBlocks';
import { Course } from '../types';
import { buildWhatsappLink, CONTACT_WHATSAPP_LABEL } from '../config';

/**
 * Where the visitor came from. Read once from the URL (?utm_source=ig&...) and
 * kept for the session, so a lead captured at the END of the course still knows
 * which Instagram post brought the person in.
 */
type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referrer?: string;
};

const ATTRIBUTION_KEY = 'virgula-attribution';

function readAttribution(): Attribution {
  try {
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* sessionStorage can be unavailable in private mode — attribution is optional. */
  }

  const params = new URLSearchParams(window.location.search);
  const attribution: Attribution = {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    utmContent: params.get('utm_content') || undefined,
    referrer: document.referrer || undefined,
  };

  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    /* ignore */
  }
  return attribution;
}

const onlyDigits = (value: string) => value.replace(/\D/g, '');

/** (75) 99116-1728 while the person types. */
function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * The end-of-course ask. It does two things on submit:
 *   1. saves the contact + message on the server, so the question is never lost
 *      even if the visitor closes WhatsApp;
 *   2. opens wa.me on the visitor's own device with the text pre-filled.
 *
 * Step 2 is a link the visitor taps — nothing is sent from our side, so no
 * automated-messaging rules are involved.
 */
const FeedbackCard = ({
  course,
  attribution,
  moduleTitle,
}: {
  course: Course;
  attribution: Attribution;
  moduleTitle?: string;
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [waLink, setWaLink] = useState('');

  const canSend = name.trim().length > 1 && message.trim().length > 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend || sending) return;
    setSending(true);

    const text =
      `Olá! Sou ${name.trim()}.\n` +
      `Acabei de fazer o curso "${course.courseName}" e queria falar sobre:\n\n` +
      `${message.trim()}`;
    const link = buildWhatsappLink(text);

    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          message: message.trim(),
          courseSlug: course.slug,
          moduleTitle,
          ...attribution,
        }),
      });
    } catch (err) {
      // The message still reaches WhatsApp even if our own save fails.
      console.error(err);
    }

    setWaLink(link);
    setSent(true);
    setSending(false);

    // Opening in the same tab is what actually launches the WhatsApp app on
    // mobile; a popup-blocked window.open would silently do nothing.
    window.location.href = link;
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 p-6 text-center">
        <div className="font-serif text-xl text-emerald-800 mb-2">Mensagem pronta!</div>
        <p className="text-[15px] text-emerald-900/80 leading-relaxed mb-4">
          O WhatsApp deve ter aberto com o seu texto. Se não abriu, toque no botão abaixo.
        </p>
        <a
          href={waLink}
          className="inline-flex items-center justify-center bg-emerald-600 text-white px-6 py-3 min-h-[48px] rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
        >
          Abrir o WhatsApp
        </a>
        <p className="mt-4 text-[13px] text-emerald-900/60">
          Ou chame direto no {CONTACT_WHATSAPP_LABEL}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm"
    >
      <h2 className="font-serif text-2xl text-primary mb-2">Ficou com alguma dúvida?</h2>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-5">
        Escreva sua dúvida ou sugestão aqui. Ao enviar, abre o WhatsApp com a mensagem
        pronta e a gente responde pessoalmente.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="fb-name" className="block text-[13px] font-medium text-muted-foreground mb-1.5">
            Seu nome
          </label>
          <input
            id="fb-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como podemos te chamar?"
            className="w-full border border-border rounded-lg px-3.5 py-3 min-h-[48px] text-[16px] bg-background text-foreground outline-none focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="fb-phone" className="block text-[13px] font-medium text-muted-foreground mb-1.5">
            Seu WhatsApp <span className="font-normal">(opcional)</span>
          </label>
          <input
            id="fb-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            className="w-full border border-border rounded-lg px-3.5 py-3 min-h-[48px] text-[16px] bg-background text-foreground outline-none focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="fb-message" className="block text-[13px] font-medium text-muted-foreground mb-1.5">
            Sua dúvida ou sugestão
          </label>
          <textarea
            id="fb-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva aqui..."
            className="w-full border border-border rounded-lg px-3.5 py-3 text-[16px] leading-relaxed bg-background text-foreground outline-none focus:border-primary resize-y"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSend || sending}
        className="mt-5 w-full bg-primary text-primary-foreground px-6 py-3.5 min-h-[52px] rounded-lg text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {sending ? 'Enviando...' : 'Enviar pelo WhatsApp'}
      </button>
      <p className="mt-3 text-[12px] text-muted-foreground text-center">
        Seus dados ficam só com a Vírgula Contábil.
      </p>
    </form>
  );
};

/** The old pre-course form, kept for courses that opt in with leadCapture: 'start'. */
const StartGate = ({
  course,
  attribution,
  onDone,
}: {
  course: Course;
  attribution: Attribution;
  onDone: () => void;
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!name.trim() || !phone.trim() || sending) return;
    setSending(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          courseSlug: course.slug,
          ...attribution,
        }),
      });
    } catch (err) {
      console.error(err);
    }
    setSending(false);
    onDone();
  };

  return (
    <div className="w-full max-w-sm bg-card border border-border p-5 rounded-xl shadow-sm">
      <h3 className="font-serif font-semibold text-lg text-primary mb-3">Antes de começar...</h3>
      <div className="space-y-3 mb-4">
        <input
          type="text"
          value={name}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-3 min-h-[48px] text-[16px] bg-background text-foreground outline-none focus:border-primary"
          placeholder="Seu nome"
        />
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          className="w-full border border-border rounded-lg px-3 py-3 min-h-[48px] text-[16px] bg-background text-foreground outline-none focus:border-primary"
          placeholder="(00) 00000-0000"
        />
      </div>
      <button
        onClick={submit}
        disabled={!name.trim() || !phone.trim() || sending}
        className="w-full bg-primary text-primary-foreground px-4 py-3 min-h-[48px] rounded-lg text-[16px] font-semibold shadow-sm disabled:opacity-50"
      >
        {sending ? 'Carregando...' : 'Começar o curso →'}
      </button>
    </div>
  );
};

export default function CourseViewer() {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [gatePassed, setGatePassed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  const [attribution] = useState<Attribution>(() => readAttribution());
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch(`/api/courses/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Curso não encontrado');
        return res.json();
      })
      .then(data => {
        setCourse(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (course && course.courseName) {
      document.title = `${course.courseName} - Vírgula Contábil`;
    }
    return () => {
      document.title = "Vírgula Contábil - Mini curso";
    };
  }, [course]);

  // Restore progress
  useEffect(() => {
    if (!slug) return;
    const saved = localStorage.getItem(`virgula-course-progress-${slug}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.current !== undefined) setCurrentIndex(parsed.current);
        if (parsed.completed) setCompleted(new Set(parsed.completed));
        if (parsed.started) setGatePassed(true);
      } catch (e) {
        console.error("Failed to parse progress", e);
      }
    }
    setIsLoaded(true);
  }, [slug]);

  // Persist progress
  useEffect(() => {
    if (!isLoaded || !slug) return;
    localStorage.setItem(`virgula-course-progress-${slug}`, JSON.stringify({
      started: gatePassed,
      current: currentIndex,
      completed: Array.from(completed),
    }));
  }, [gatePassed, currentIndex, completed, isLoaded, slug]);

  // Keep the active chip visible in the mobile module strip.
  useEffect(() => {
    const strip = chipsRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>('[data-active="true"]');
    if (active) {
      strip.scrollTo({ left: active.offsetLeft - 16, behavior: 'smooth' });
    }
  }, [currentIndex]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-red-500">{error || 'Erro desconhecido'}</p>
        <Link to="/" className="text-primary underline font-medium">Ver todos os cursos</Link>
      </div>
    );
  }

  const courseModules = course.modules;
  const captureMode = course.leadCapture || 'end';

  // Opt-in only: by default the content opens immediately.
  if (captureMode === 'start' && !gatePassed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center">
        <div className="w-full max-w-3xl px-5 py-12 sm:py-16 flex flex-col items-start">
          <Logo />
          <div className="mt-10 font-sans font-semibold text-[12px] uppercase tracking-[0.14em] text-accent mb-4">
            Mini Curso · {courseModules.length} Módulos
          </div>
          <h1 className="font-serif font-normal text-[34px] sm:text-5xl md:text-6xl text-primary leading-[1.08] mb-5 tracking-[-0.02em]">
            {course.courseName}
          </h1>
          <p className="text-[17px] sm:text-[18px] text-muted-foreground max-w-xl mb-10 leading-relaxed">
            {course.description}
          </p>
          <StartGate course={course} attribution={attribution} onDone={() => setGatePassed(true)} />
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((completed.size / courseModules.length) * 100);
  const allCompleted = completed.size === courseModules.length;
  const isLastModule = currentIndex === courseModules.length - 1;
  const currentMod = courseModules[currentIndex];

  const goTo = (index: number) => {
    setCurrentIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    const newCompleted = new Set(completed);
    newCompleted.add(currentIndex);
    setCompleted(newCompleted);

    if (currentIndex < courseModules.length - 1) {
      goTo(currentIndex + 1);
    } else {
      // Last module: send the reader to the question box rather than nowhere.
      // Deferred, because completing the course inserts the "concluído" panel
      // above and moves the target.
      requestAnimationFrame(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header: logo + progress. The progress bar is the full width of the
          screen edge-to-edge on mobile, where the header has no room for text. */}
      <header className="sticky top-0 z-30 w-full bg-background/90 backdrop-blur border-b border-border/70">
        <div className="h-[60px] flex items-center px-4 sm:px-5">
          <div className="w-full max-w-6xl mx-auto flex justify-between items-center gap-4">
            <Logo />
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-medium text-muted-foreground hidden sm:block">
                {progressPercent}% concluído
              </span>
              <div className="hidden sm:block h-1.5 w-28 md:w-40 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile progress bar: a single hairline under the header. */}
        <div className="sm:hidden h-1 w-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Mobile module strip — replaces the sidebar, which used to sit BELOW
            the content on phones and was effectively unreachable. */}
        <div
          ref={chipsRef}
          className="md:hidden flex gap-2 overflow-x-auto px-4 py-2.5 border-t border-border/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {courseModules.map((mod, i) => {
            const isActive = i === currentIndex;
            const isDone = completed.has(i);
            return (
              <button
                key={mod.id}
                data-active={isActive}
                onClick={() => goTo(i)}
                className={`shrink-0 flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-full border text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isDone
                      ? 'border-primary/30 bg-primary/5 text-primary'
                      : 'border-border bg-card text-muted-foreground'
                }`}
              >
                <span className={`h-5 w-5 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  isActive ? 'bg-primary-foreground/20' : isDone ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}>
                  {isDone && !isActive ? '✓' : i + 1}
                </span>
                <span className="whitespace-nowrap max-w-[140px] truncate">{mod.shortTitle}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-5 md:px-8 py-6 md:py-8 flex-1 flex flex-col md:flex-row gap-8">

        {/* Desktop sidebar */}
        <aside className="hidden md:block md:w-[240px] md:shrink-0 md:sticky md:top-24 md:h-fit">
          <h3 className="font-sans font-semibold uppercase text-[12px] tracking-[0.14em] text-muted-foreground mb-4 pl-3">
            Módulos
          </h3>
          <nav className="flex flex-col space-y-1">
            {courseModules.map((mod, i) => {
              const isActive = i === currentIndex;
              const isCompleted = completed.has(i);

              return (
                <button
                  key={mod.id}
                  onClick={() => goTo(i)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-primary/10' : 'hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <div className={`h-5 w-5 shrink-0 rounded-full border text-[10px] font-bold flex items-center justify-center transition-colors ${
                    isCompleted ? 'border-primary bg-primary text-primary-foreground'
                    : isActive ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground'
                  }`}>
                    {isCompleted ? "✓" : (i + 1)}
                  </div>
                  <span className={`text-[14px] leading-tight ${
                    isActive ? 'font-semibold text-primary' : 'font-medium text-muted-foreground'
                  }`}>
                    {mod.shortTitle}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Module content. pb-28 on mobile keeps the sticky bottom bar from
            covering the last lines of a module. */}
        <main className="flex-1 flex flex-col min-w-0 pb-28 md:pb-16">

          {allCompleted && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="font-serif text-xl text-primary mb-1">🎉 Você concluiu o curso</div>
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  Todos os {courseModules.length} módulos de {course.courseName}.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    setCompleted(new Set());
                    goTo(0);
                  }}
                  className="border border-primary/30 bg-card text-primary px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold hover:bg-primary/10 transition-colors"
                >
                  Refazer
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center border border-border bg-card px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold hover:bg-secondary transition-colors"
                >
                  Outros cursos
                </Link>
              </div>
            </div>
          )}

          <article className="rounded-2xl border border-border bg-card p-5 sm:p-7 md:p-10 shadow-sm overflow-hidden break-words">
            <div className="font-sans font-semibold uppercase text-[11px] sm:text-[12px] tracking-[0.14em] text-accent mb-3">
              {currentMod.kicker}
            </div>
            <h1 className="font-serif font-normal text-[28px] sm:text-3xl md:text-4xl text-primary leading-[1.15] mb-3 tracking-[-0.02em]">
              {currentMod.title}
            </h1>
            <p className="text-[17px] sm:text-[18px] text-muted-foreground leading-relaxed">
              {currentMod.summary}
            </p>

            <div className="mt-7 space-y-5">
              {currentMod.content.map((block, i) => (
                <BlockRenderer key={i} block={block} moduleIndex={currentIndex} />
              ))}
            </div>
          </article>

          {/* Desktop navigation. On mobile this lives in the sticky bar below. */}
          <div className="hidden md:flex mt-6 justify-between items-center gap-4">
            <button
              onClick={() => currentIndex > 0 && goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className={`border border-border bg-card px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-secondary'
              }`}
            >
              ← Anterior
            </button>

            <span className="text-[14px] text-muted-foreground font-medium">
              {currentIndex + 1} de {courseModules.length}
            </span>

            <button
              onClick={handleNext}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-transform"
            >
              {isLastModule ? 'Concluir curso' : 'Próximo módulo →'}
            </button>
          </div>

          {/* The ask sits at the end, after the reader already got the content. */}
          {captureMode !== 'none' && (isLastModule || allCompleted) && (
            <div ref={feedbackRef} className="mt-8 scroll-mt-28">
              <FeedbackCard
                course={course}
                attribution={attribution}
                moduleTitle={currentMod.shortTitle}
              />
            </div>
          )}
        </main>
      </div>

      {/* Sticky thumb-reach navigation on phones. */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => currentIndex > 0 && goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            aria-label="Módulo anterior"
            className={`h-12 w-12 shrink-0 rounded-lg border border-border bg-card text-lg font-medium ${
              currentIndex === 0 ? 'opacity-30' : 'active:bg-secondary'
            }`}
          >
            ←
          </button>
          <span className="text-[13px] text-muted-foreground font-medium tabular-nums shrink-0">
            {currentIndex + 1}/{courseModules.length}
          </span>
          <button
            onClick={handleNext}
            className="flex-1 h-12 bg-primary text-primary-foreground rounded-lg text-[15px] font-semibold shadow-sm active:opacity-90"
          >
            {isLastModule ? 'Concluir curso' : 'Próximo módulo →'}
          </button>
        </div>
      </div>

      <footer className="mt-auto border-t border-border py-8 pb-24 md:pb-8 text-center text-[12px] text-muted-foreground space-y-1">
        <p>© {new Date().getFullYear()} Vírgula Contábil. Todos os direitos reservados.</p>
        <p>Conteúdo gratuito e informal, para orientação básica.</p>
      </footer>
    </div>
  );
}
