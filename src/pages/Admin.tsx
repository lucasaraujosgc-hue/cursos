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

  const handleChangeSlug = async (course: Course) => {
    const newSlug = prompt("Digite o novo link curto (slug) para este curso:", course.slug);
    if (!newSlug || newSlug === course.slug) return;
    
    // To change the slug, we just PUT the updated course object
    const updatedCourse = { ...course, slug: newSlug };
    try {
      const res = await fetch(`/api/admin/courses/${course.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCourse)
      });
      if (!res.ok) throw new Error('Erro ao alterar o link');
      fetchCourses();
    } catch (err) {
      alert('Erro ao alterar o link');
    }
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-accent bg-accent/10 px-2 py-1 rounded">/{course.slug}</span>
                      <button onClick={() => handleChangeSlug(course)} className="text-xs text-muted-foreground hover:text-primary underline">
                        Alterar Link
                      </button>
                    </div>
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
            <div className="mt-16 bg-card border border-border rounded-xl p-6 md:p-8">
              <h2 className="text-2xl font-serif text-primary mb-4">Prompt para Criação com IA</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Copie o prompt abaixo e cole no ChatGPT, Claude ou outra IA. Ele contém todas as instruções e regras para que a IA gere o JSON do curso estruturado com os componentes visuais que o sistema suporta.
              </p>
              
              <div className="relative">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(aiPrompt);
                    alert("Prompt copiado!");
                  }}
                  className="absolute top-4 right-4 bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                >
                  Copiar Prompt
                </button>
                <textarea 
                  readOnly 
                  value={aiPrompt}
                  className="w-full h-64 font-mono text-xs p-4 pt-12 border border-border rounded-lg bg-background text-muted-foreground outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const aiPrompt = `Gere o conteúdo de um mini curso no formato JSON seguindo estritamente a estrutura definida abaixo. O JSON será importado em um sistema educacional que suporta renderização dinâmica de blocos.

Crie um curso sobre [INSERIR TEMA AQUI].

ESTRUTURA DO JSON:
O JSON deve ser um objeto único contendo os detalhes do curso e um array de módulos.
{
  "slug": "url-amigavel-do-curso",
  "courseName": "Nome do Curso",
  "description": "Descrição curta do que será aprendido.",
  "modules": [ ... ]
}

ESTRUTURA DOS MÓDULOS:
Cada módulo dentro do array "modules" deve ter o formato:
{
  "id": "identificador-unico",
  "shortTitle": "Título Curto (menu sidebar)",
  "kicker": "MÓDULO XX · CATEGORIA (uppercase)",
  "title": "Título Principal do Módulo",
  "summary": "Resumo do que será ensinado no módulo.",
  "content": [ ... array de blocos visuais ... ]
}

BLOCOS VISUAIS SUPORTADOS (ARRAY "content"):
Você deve construir o conteúdo combinando apenas os blocos abaixo. Misture os formatos para criar uma leitura dinâmica.

1. Parágrafo simples:
{ "type": "paragraph", "text": "Texto do parágrafo." }

2. Subtítulo (H2):
{ "type": "heading", "text": "Subtítulo da seção" }

3. Lista com bullets:
{ "type": "list", "items": ["Item 1", "Item 2"] }

4. Callout (Caixa de destaque com título e itens):
{ "type": "callout", "title": "TÍTULO DO DESTAQUE", "items": ["Regra 1", "Regra 2"] }

5. Citação/Frase de Impacto (Itálico com borda):
{ "type": "highlight", "text": "Frase importante que merece destaque." }

6. Timeline/Cronograma (Grade de Ano + Texto):
{ "type": "timeline", "items": [ { "year": "2024", "text": "Evento 1" }, { "year": "2025", "text": "Evento 2" } ] }

7. Checklist interativo:
{ "type": "checklist", "items": ["Tarefa 1 para o aluno", "Tarefa 2 para o aluno"] }

8. Fórmula Matemática (LaTeX):
{ "type": "math", "expression": "E = mc^2", "inline": false }

9. Calculadora Interativa:
{ 
  "type": "calculator", 
  "fields": [
    { "id": "receita", "label": "Receita Bruta (R$)", "type": "currency" },
    { "id": "aliquota", "label": "Alíquota (%)", "type": "percentage" }
  ],
  "formula": "receita * (aliquota / 100)",
  "resultLabel": "Imposto Estimado",
  "resultFormat": "currency"
}

10. Gráfico de Ponto de Equilíbrio:
{ "type": "breakeven-chart", "custoFixo": 10000, "custoVariavelUnitario": 50, "precoVenda": 100, "quantidadeMaxima": 500 }

11. Gráfico de Detalhamento de Custos (Pizza):
{ "type": "breakdown-chart", "total": 15000, "parts": [ { "label": "Impostos", "value": 3000 }, { "label": "Folha", "value": 12000 } ] }

12. Tabela de Comparação:
{ "type": "comparison", "columns": [ { "label": "Prós", "tone": "positive", "items": ["Vantagem 1"] }, { "label": "Contras", "tone": "negative", "items": ["Desvantagem 1"] } ] }

13. Exercício de Classificação:
{ "type": "classify-exercise", "items": ["Aluguel", "Comissão"], "categories": ["Fixo", "Variável"], "answerKey": { "Aluguel": "Fixo", "Comissão": "Variável" } }

14. Gráfico de Cenários:
{ "type": "scenario-chart", "custoFixo": 5000, "custoVariavelUnitario": 20, "qtdMin": 100, "qtdMax": 1000 }

REGRAS VITAIS:
- O retorno deve ser APENAS o JSON válido.
- Não inclua markdown de código \`\`\`json em volta da resposta se isso quebrar a leitura.
- Use tom editorial, direto e profissional.
- O curso deve ter pelo menos 3 a 5 módulos.
- Não crie tipos de blocos que não estão listados acima.`;

