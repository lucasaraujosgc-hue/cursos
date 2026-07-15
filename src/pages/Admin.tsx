import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { Course } from '../types';

export default function Admin() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editJson, setEditJson] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses');
      if (res.status === 401) {
        navigate('/admin/login');
        return;
      }
      if (!res.ok) throw new Error('Erro ao buscar cursos');
      const data = await res.json();
      setCourses(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    navigate('/admin/login');
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Tem certeza que deseja excluir o curso "${slug}"?`)) return;
    try {
      await fetch(`/api/admin/courses/${slug}`, { method: 'DELETE' });
      fetchCourses();
    } catch (err) {
      alert('Erro ao excluir curso');
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setEditJson(JSON.stringify(course, null, 2));
  };

  const handleCreateNew = () => {
    const newCourse: Course = {
      slug: "novo-curso",
      courseName: "Novo Curso",
      description: "Descrição breve do curso...",
      modules: []
    };
    setEditingCourse(newCourse);
    setEditJson(JSON.stringify(newCourse, null, 2));
  };

  const handleSave = async () => {
    try {
      const parsedCourse = JSON.parse(editJson) as Course;
      if (!parsedCourse.slug) throw new Error('O curso deve ter um slug');
      
      const isNew = !courses.find(c => c.slug === editingCourse?.slug);
      
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/admin/courses' : `/api/admin/courses/${editingCourse?.slug}`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedCourse)
      });

      if (!res.ok) throw new Error('Erro ao salvar curso');
      
      setEditingCourse(null);
      setEditJson('');
      fetchCourses();
    } catch (err: any) {
      alert('JSON Inválido ou erro na requisição: ' + err.message);
    }
  };

  if (loading) return <div className="p-8">Carregando admin...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-20 w-full bg-card border-b border-border h-[64px] flex items-center px-5">
        <div className="w-full max-w-6xl mx-auto flex justify-between items-center">
          <Logo />
          <div className="flex gap-4">
            <button onClick={handleLogout} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-5 py-8 flex-1">
        {editingCourse ? (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-primary">Editor de Curso (JSON)</h2>
              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 text-sm border border-border rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg"
                >
                  Salvar Curso
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              O "slug" define o caminho da URL (ex: meu.site.com.br/<b>slug</b>). Certifique-se de que o JSON é válido.
            </p>
            <textarea 
              value={editJson}
              onChange={(e) => setEditJson(e.target.value)}
              className="w-full h-[600px] font-mono text-sm p-4 border border-border rounded-lg bg-background"
            />
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-serif text-primary">Cursos</h1>
              <button 
                onClick={handleCreateNew}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90"
              >
                + Criar Curso
              </button>
            </div>

            {error && <div className="text-red-500 mb-4">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map(course => (
                <div key={course.slug} className="bg-card border border-border rounded-xl p-6 flex flex-col">
                  <h3 className="text-xl font-serif text-primary mb-2">{course.courseName}</h3>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">{course.description}</p>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                    <span className="text-sm font-mono text-accent bg-accent/10 px-2 py-1 rounded">/{course.slug}</span>
                    <div className="flex gap-2">
                      <a href={`/${course.slug}`} target="_blank" rel="noreferrer" className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-secondary">
                        Ver
                      </a>
                      <button onClick={() => handleEdit(course)} className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-secondary">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(course.slug)} className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50">
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {courses.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                  Nenhum curso encontrado. Crie o seu primeiro curso!
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
