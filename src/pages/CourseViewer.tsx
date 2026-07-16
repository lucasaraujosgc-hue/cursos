import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { BlockRenderer } from '../components/CourseBlocks';
import { Course } from '../types';

const CertificateBlock = ({ courseName }: { courseName: string }) => {
  return (
    <div className="rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5 p-8 flex flex-col items-center justify-center mb-8 text-center shadow-sm">
      <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-4 text-3xl shadow-lg">
        🎓
      </div>
      <h2 className="font-serif font-semibold text-2xl text-emerald-700 mb-2">
        Certificado de Conclusão
      </h2>
      <p className="text-muted-foreground max-w-md">
        Parabéns! Você concluiu com sucesso todos os módulos do curso <strong className="text-foreground">{courseName}</strong>.
      </p>
      <button 
        onClick={() => window.print()}
        className="mt-6 bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
      >
        Imprimir Certificado
      </button>
    </div>
  );
};

export default function CourseViewer() {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

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

  // Load from LocalStorage
  useEffect(() => {
    if (slug) {
      const saved = localStorage.getItem(`virgula-course-progress-${slug}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.started) setStarted(parsed.started);
          if (parsed.current !== undefined) setCurrentIndex(parsed.current);
          if (parsed.completed) setCompleted(new Set(parsed.completed));
        } catch (e) {
          console.error("Failed to parse progress", e);
        }
      }
      setIsLoaded(true);
    }
  }, [slug]);

  // Save to LocalStorage
  useEffect(() => {
    if (isLoaded && started && slug) {
      localStorage.setItem(`virgula-course-progress-${slug}`, JSON.stringify({
        started,
        current: currentIndex,
        completed: Array.from(completed)
      }));
    }
  }, [started, currentIndex, completed, isLoaded, slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (error || !course) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'Erro desconhecido'}</div>;
  }

  const courseModules = course.modules;

  const handleStartCourse = async () => {
    if (!leadName.trim() || !leadPhone.trim()) return;
    setIsSubmittingLead(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName.trim(),
          phone: leadPhone.trim(),
          courseSlug: slug
        })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingLead(false);
      setStarted(true);
    }
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center">
        <div className="w-full max-w-3xl px-5 py-16 md:py-24 flex flex-col items-start">
          <Logo />
          <div className="mt-12 font-sans font-semibold text-[12px] uppercase tracking-[0.14em] text-accent mb-4">
            Mini Curso · {courseModules.length} Módulos
          </div>
          <h1 className="font-serif font-normal text-4xl md:text-6xl text-primary leading-[1.05] mb-6 tracking-[-0.02em]">
            {course.courseName}
          </h1>
          <p className="text-[18px] text-muted-foreground max-w-xl mb-12 leading-relaxed">
            {course.description}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-12">
            {courseModules.slice(0, 3).map((mod, i) => (
              <div key={mod.id} className="rounded-xl border border-border bg-card p-4">
                <div className="font-serif font-bold text-[24px] text-accent mb-2">0{i + 1}</div>
                <div className="font-sans font-medium text-[14px] text-foreground/90">{mod.shortTitle}</div>
              </div>
            ))}
          </div>

          <div className="w-full max-w-sm mt-4 bg-card border border-border p-5 rounded-xl shadow-sm">
            <h3 className="font-serif font-semibold text-lg text-primary mb-3">Antes de começar...</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[13px] font-medium text-muted-foreground mb-1">Seu Nome</label>
                <input 
                  type="text" 
                  value={leadName}
                  onChange={e => setLeadName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-[14px] bg-background text-foreground outline-none focus:border-primary"
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-muted-foreground mb-1">Seu Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  value={leadPhone}
                  onChange={e => setLeadPhone(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-[14px] bg-background text-foreground outline-none focus:border-primary"
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>
            </div>
            <button 
              onClick={handleStartCourse}
              disabled={!leadName.trim() || !leadPhone.trim() || isSubmittingLead}
              className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-[15px] font-semibold shadow-sm hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmittingLead ? "Carregando..." : "Começar o curso →"}
            </button>
          </div>
          <p className="mt-4 text-[12px] text-muted-foreground">Seu progresso fica salvo neste navegador</p>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((completed.size / courseModules.length) * 100);
  const allCompleted = completed.size === courseModules.length;
  const currentMod = courseModules[currentIndex];

  const handleNext = () => {
    const newCompleted = new Set(completed);
    newCompleted.add(currentIndex);
    setCompleted(newCompleted);

    if (currentIndex < courseModules.length - 1) {
      setCurrentIndex(c => c + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 w-full bg-background/85 backdrop-blur border-b border-border/70 h-[64px] flex items-center px-5">
        <div className="w-full max-w-6xl mx-auto flex justify-between items-center">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="text-[12px] font-sans font-medium text-muted-foreground hidden sm:block">
              Progresso {progressPercent}%
            </span>
            <div className="h-1.5 w-24 sm:w-28 md:w-40 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="w-full max-w-6xl mx-auto px-5 md:px-8 py-8 flex-1 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="md:w-[240px] md:shrink-0 md:sticky md:top-24 md:h-fit">
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
                  onClick={() => {
                    setCurrentIndex(i);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
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

        {/* Module Content */}
        <main className="flex-1 flex flex-col pb-16 min-w-0">
          
          {allCompleted && (
            <CertificateBlock courseName={course.courseName} />
          )}

          {allCompleted && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <span className="font-sans font-semibold text-[14px] uppercase tracking-[0.14em] text-primary text-center sm:text-left">
                🎉 Curso Concluído
              </span>
              <button
                onClick={() => {
                  setCompleted(new Set());
                  setCurrentIndex(0);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="border border-primary/30 bg-card text-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/10 transition-colors w-full sm:w-auto"
              >
                Refazer o curso
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 md:p-10 shadow-sm overflow-hidden break-words">
            <div className="font-sans font-semibold uppercase text-[12px] tracking-[0.14em] text-accent mb-3">
              {currentMod.kicker}
            </div>
            <h1 className="font-serif font-normal text-3xl md:text-4xl text-primary leading-[1.15] mb-3 tracking-[-0.02em]">
              {currentMod.title}
            </h1>
            <p className="text-[18px] text-muted-foreground leading-relaxed">
              {currentMod.summary}
            </p>

            <div className="mt-8 space-y-5">
              {currentMod.content.map((block, i) => (
                <BlockRenderer key={i} block={block} moduleIndex={currentIndex} />
              ))}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`w-full sm:w-auto border border-border bg-card px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
              className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-transform"
            >
              {currentIndex === courseModules.length - 1 ? 'Concluir curso' : 'Próximo módulo →'}
            </button>
          </div>

        </main>
      </div>
      
      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8 text-center text-[12px] text-muted-foreground space-y-1">
        <p>© {new Date().getFullYear()} Vírgula Contábil. Todos os direitos reservados.</p>
        <p>Manual de Orientações Básicas para clientes.</p>
      </footer>
    </div>
  );
}
