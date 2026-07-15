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
      <header className="sticky top-0 z-20 w-full bg-card border-b border-border h-[64px] flex items-center px-5">
        <div className="w-full max-w-6xl mx-auto flex justify-between items-center">
          <Logo />
          <div className="flex gap-4">
            <Link to="/admin/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Acesso Administrativo
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-5 py-12 flex-1 flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-serif text-primary mb-4 text-center">
          Cursos e Treinamentos
        </h1>
        <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl">
          Selecione um dos nossos cursos abaixo para iniciar o seu aprendizado.
        </p>

        {loading ? (
          <div className="text-muted-foreground">Carregando cursos...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {courses.map(course => (
              <Link 
                key={course.slug} 
                to={`/${course.slug}`}
                className="bg-card border border-border rounded-xl p-6 flex flex-col hover:border-primary/50 transition-colors shadow-sm hover:shadow-md"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">
                  {course.moduleCount} {course.moduleCount === 1 ? 'Módulo' : 'Módulos'}
                </div>
                <h3 className="text-2xl font-serif text-primary mb-3">
                  {course.courseName}
                </h3>
                <p className="text-sm text-muted-foreground flex-1 line-clamp-3">
                  {course.description}
                </p>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-primary font-medium text-sm group">
                  Acessar Curso
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
        <p>Plataforma de Treinamento</p>
      </footer>
    </div>
  );
}
