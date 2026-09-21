import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

type CourseOverview = {
  slug: string;
  courseName: string;
  description: string;
  moduleCount: number;
};

export default function Home() {
  const [courses, setCourses] = useState<CourseOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/courses')
      .then(res => {
        if (!res.ok) throw new Error('Erro ao carregar cursos');
        return res.json();
      })
      .then(data => {
        setCourses(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-20 w-full bg-card/90 backdrop-blur border-b border-border h-[60px] flex items-center px-4 sm:px-5">
        <div className="w-full max-w-6xl mx-auto flex justify-between items-center">
          <Logo />
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-5 py-10 sm:py-14 flex-1 flex flex-col">
        <div className="flex flex-col items-center text-center mb-10 sm:mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-accent-foreground/80 mb-5">
            Gratuito · sem cadastro
          </span>
          <h1 className="font-serif text-[34px] sm:text-5xl text-primary mb-4 leading-[1.08] tracking-[-0.02em] max-w-3xl">
            Entenda a contabilidade da sua empresa em 10 minutos
          </h1>
          <p className="text-[17px] sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Cursos curtos, em linguagem de gente. Você lê pelo celular, no seu tempo,
            e sai sabendo o que fazer na prática.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-16">Carregando cursos...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-16">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
            {courses.map(course => (
              <Link
                key={course.slug}
                to={`/${course.slug}`}
                className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col hover:border-primary/50 transition-colors shadow-sm hover:shadow-md active:scale-[0.99]"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">
                  {course.moduleCount} {course.moduleCount === 1 ? 'Módulo' : 'Módulos'} · leitura rápida
                </div>
                <h2 className="text-[22px] sm:text-2xl font-serif text-primary mb-3 leading-snug">
                  {course.courseName}
                </h2>
                <p className="text-[15px] text-muted-foreground flex-1 leading-relaxed line-clamp-4">
                  {course.description}
                </p>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-primary font-semibold text-[15px] group">
                  Começar agora
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}

            {courses.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                Nenhum curso disponível no momento.
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-border py-8 text-center text-[12px] text-muted-foreground space-y-1">
        <p>© {new Date().getFullYear()} Vírgula Contábil. Todos os direitos reservados.</p>
        <p>Conteúdo gratuito e informal, para orientação básica.</p>
      </footer>
    </div>
  );
}
