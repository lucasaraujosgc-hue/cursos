import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { agrupaPorSerie } from '../lib/grupos';

type CourseOverview = {
  slug: string;
  courseName: string;
  description: string;
  image?: string;
  category?: string;
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

  const grupos = useMemo(() => agrupaPorSerie(courses), [courses]);
  // Enquanto nenhum curso tiver série, um único título de grupo não informa nada.
  const mostrarTitulos = useMemo(() => courses.some(c => (c.category || '').trim()), [courses]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-20 w-full bg-card/90 backdrop-blur border-b border-border h-[60px] flex items-center px-4 sm:px-5">
        <div className="w-full max-w-6xl mx-auto flex justify-between items-center">
          <Logo />
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-5 py-10 sm:py-14 flex-1 flex flex-col">
        <div className="flex flex-col items-center text-center mb-10 sm:mb-14">
          <h1 className="font-serif text-[34px] sm:text-5xl text-primary mb-4 leading-[1.08] tracking-[-0.02em] max-w-3xl">
            Entenda sua empresa em 10 min por dia
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
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
            Nenhum curso disponível no momento.
          </div>
        ) : (
          <div className="w-full space-y-12 sm:space-y-14">
            {grupos.map(grupo => (
              <section key={grupo.nome}>
                {/* Sem série nenhuma cadastrada, o título do grupo só poluiria. */}
                {mostrarTitulos && (
                  <div className="mb-5 sm:mb-6">
                    <h2 className="font-serif text-[26px] sm:text-3xl text-primary leading-tight">
                      {grupo.nome}
                    </h2>
                    <p className="mt-1 text-[14px] text-muted-foreground">
                      {grupo.cursos.length} {grupo.cursos.length === 1 ? 'curso' : 'cursos'} nesta série
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {grupo.cursos.map(course => (
              <Link
                key={course.slug}
                to={`/${course.slug}`}
                className="bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:border-primary/50 transition-colors shadow-sm hover:shadow-md active:scale-[0.99]"
              >
                {course.image && (
                  <img
                    src={course.image}
                    alt=""
                    loading="lazy"
                    className="w-full aspect-[16/9] object-cover bg-secondary"
                  />
                )}
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">
                  {course.moduleCount} {course.moduleCount === 1 ? 'Módulo' : 'Módulos'} · leitura rápida
                </div>
                <h3 className="text-[22px] sm:text-2xl font-serif text-primary mb-3 leading-snug">
                  {course.courseName}
                </h3>
                <p className="text-[15px] text-muted-foreground flex-1 leading-relaxed line-clamp-4">
                  {course.description}
                </p>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-primary font-semibold text-[15px] group">
                  Começar agora
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
                </div>
              </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-border py-8 text-center text-[12px] text-muted-foreground space-y-1">
        <p>© {new Date().getFullYear()} Vírgula Contábil. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
