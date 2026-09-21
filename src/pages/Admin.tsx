import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { Course } from '../types';
import { agrupaPorSerie, seriesExistentes, moveCursoNaSerie, moveSerie } from '../lib/grupos';

// Keeps recharts out of the bundle that course readers download.
const StatsPanel = lazy(() => import('./StatsPanel'));
const VisitorsPanel = lazy(() => import('./VisitorsPanel'));

/** Turns a typed Brazilian number into a wa.me link for one-tap manual contact. */
function leadWhatsappLink(phone: string, name: string, courseSlug: string) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  const text =
    `Olá${name ? `, ${name.split(' ')[0]}` : ''}! Aqui é da Vírgula Contábil. ` +
    `Vi que você fez nosso curso${courseSlug ? ` de ${courseSlug}` : ''} e vim saber se posso ajudar em alguma coisa.`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}

const CAPTURE_HELP: Record<string, string> = {
  none: 'O curso não pede dados em nenhum momento. Você não captura leads por ele.',
  end: 'Conteúdo todo aberto. O contato só é pedido no fim, junto da dúvida — menos leads, porém mais qualificados.',
  middle:
    'Os primeiros módulos são abertos e o curso exige o cadastro para seguir. Meio-termo entre volume e qualidade.',
  start:
    'Pede os dados antes de qualquer conteúdo. Captura mais gente, mas costuma perder boa parte de quem chega das redes sociais, e com dados menos confiáveis.',
};

function leadsToCsv(leads: any[]) {
  const headers = ['Data', 'Nome', 'Telefone', 'Curso', 'Mensagem', 'Origem', 'Campanha', 'Post'];
  const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = leads.map((l) =>
    [
      new Date(l.timestamp).toLocaleString('pt-BR'),
      l.name,
      l.phone,
      l.courseSlug,
      l.message,
      l.utmSource,
      l.utmCampaign,
      l.utmContent,
    ]
      .map(escape)
      .join(',')
  );
  return [headers.map(escape).join(','), ...lines].join('\n');
}

export default function Admin() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editJson, setEditJson] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'courses' | 'stats' | 'visitors' | 'leads'>('courses');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [salvandoOrdem, setSalvandoOrdem] = useState(false);
  const navigate = useNavigate();

  const fetchCoursesAndLeads = async () => {
    try {
      const res = await fetch('/api/admin/courses');
      if (res.status === 401) {
        navigate('/admin/login');
        return;
      }
      if (!res.ok) throw new Error('Erro ao buscar cursos');
      const data = await res.json();
      setCourses(data);

      const resLeads = await fetch('/api/admin/leads');
      if (resLeads.ok) {
        const leadsData = await resLeads.json();
        setLeads(leadsData);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesAndLeads();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    navigate('/admin/login');
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Tem certeza que deseja excluir o curso "${slug}"?`)) return;
    try {
      await fetch(`/api/admin/courses/${slug}`, { method: 'DELETE' });
      fetchCoursesAndLeads();
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
      fetchCoursesAndLeads();
    } catch (err) {
      alert('Erro ao alterar o link');
    }
  };

  /** Saves a field of one course without opening the JSON editor. */
  const handleUpdateCourse = async (course: Course, patch: Partial<Course>) => {
    const updated = { ...course, ...patch };
    // Optimistic: the control reflects the choice while the request is in flight.
    setCourses(prev => prev.map(c => (c.slug === course.slug ? updated : c)));
    try {
      const res = await fetch(`/api/admin/courses/${course.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
    } catch (err) {
      alert('Não foi possível salvar a alteração no curso.');
      fetchCoursesAndLeads();
    }
  };

  /** Uploads the picked file and attaches the returned URL to the course. */
  const handleUploadImage = async (course: Course, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem (PNG, JPG, WEBP ou GIF).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('A imagem passa de 8 MB. Reduza o arquivo e tente de novo.');
      return;
    }

    setUploadingSlug(course.slug);
    try {
      // Sent as raw bytes — no multipart, no base64 inflating the payload.
      const res = await fetch('/api/admin/uploads', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no envio');
      await handleUpdateCourse(course, { image: data.url });
    } catch (err: any) {
      alert(err.message || 'Não foi possível enviar a imagem.');
    } finally {
      setUploadingSlug(null);
    }
  };

  const gruposAdmin = useMemo(() => agrupaPorSerie(courses), [courses]);
  const series = useMemo(() => seriesExistentes(courses), [courses]);

  /** Grava a nova ordem. A ordem do array no servidor é a ordem da home. */
  const reordenar = async (novaOrdem: Course[]) => {
    if (salvandoOrdem) return;
    const anterior = courses;
    setCourses(novaOrdem);          // otimista: a seta responde na hora
    setSalvandoOrdem(true);
    try {
      const res = await fetch('/api/admin/course-order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs: novaOrdem.map(c => c.slug) }),
      });
      if (!res.ok) throw new Error('Erro ao salvar a ordem');
    } catch (err) {
      setCourses(anterior);
      alert('Não foi possível salvar a nova ordem.');
    } finally {
      setSalvandoOrdem(false);
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
      fetchCoursesAndLeads();
    } catch (err: any) {
      alert('JSON Inválido ou erro na requisição: ' + err.message);
    }
  };

  /** Name the downloaded file after the course's slug, when the JSON parses. */
  const editJsonFilename = () => {
    try {
      const slug = JSON.parse(editJson)?.slug;
      if (typeof slug === 'string' && slug.trim()) return `${slug.trim()}.json`;
    } catch {
      /* invalid JSON is still worth downloading as a draft */
    }
    return 'curso.json';
  };

  const handleCopyJson = async () => {
    if (!editJson) return;
    try {
      await navigator.clipboard.writeText(editJson);
    } catch {
      // clipboard API needs a secure context; fall back to a temporary selection
      const el = document.createElement('textarea');
      el.value = editJson;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!editJson) return;
    const blob = new Blob([editJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = editJsonFilename();
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleLead = (timestamp: string) => {
    setSelectedLeads(prev => 
      prev.includes(timestamp) ? prev.filter(t => t !== timestamp) : [...prev, timestamp]
    );
  };

  const toggleAllLeads = () => {
    if (selectedLeads.length === leads.length && leads.length > 0) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  const handleDeleteSelectedLeads = async () => {
    if (selectedLeads.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.length} lead(s)?`)) return;
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedLeads })
      });
      if (!res.ok) throw new Error('Erro ao excluir leads');
      setSelectedLeads([]);
      fetchCoursesAndLeads();
    } catch (err) {
      alert('Erro ao excluir leads');
    }
  };

  if (loading) return <div className="p-8">Carregando admin...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-20 w-full bg-card border-b border-border h-[64px] flex items-center px-4 sm:px-5">
        <div className="w-full max-w-6xl mx-auto flex justify-between items-center gap-3">
          <div className="shrink-0"><Logo /></div>
          {/* Com quatro abas + Sair o menu estourava a largura do celular:
              rola de lado em vez de empurrar a página. */}
          <div className="flex gap-3 sm:gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button 
              onClick={() => setActiveTab('courses')}
              className={`text-sm font-medium shrink-0 whitespace-nowrap ${activeTab === 'courses' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Cursos
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`text-sm font-medium shrink-0 whitespace-nowrap ${activeTab === 'stats' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Acessos
            </button>
            <button 
              onClick={() => setActiveTab('visitors')}
              className={`text-sm font-medium shrink-0 whitespace-nowrap ${activeTab === 'visitors' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Visitantes
            </button>
            <button 
              onClick={() => setActiveTab('leads')}
              className={`text-sm font-medium shrink-0 whitespace-nowrap ${activeTab === 'leads' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Leads
            </button>
            <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-700 shrink-0 whitespace-nowrap">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-5 py-8 flex-1">
        {activeTab === 'stats' ? (
          <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Carregando painel...</div>}>
            <StatsPanel />
          </Suspense>
        ) : activeTab === 'visitors' ? (
          <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Carregando visitantes...</div>}>
            <VisitorsPanel />
          </Suspense>
        ) : activeTab === 'leads' ? (
          <div>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
              <h1 className="text-3xl font-serif text-primary">Leads</h1>
              <div className="flex flex-wrap gap-2">
                {leads.length > 0 && (
                  <button
                    onClick={() => {
                      const blob = new Blob(['﻿' + leadsToCsv(leads)], { type: 'text/csv;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="border border-border bg-card px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Exportar CSV
                  </button>
                )}
                {selectedLeads.length > 0 && (
                  <button
                    onClick={handleDeleteSelectedLeads}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-red-600 transition-colors"
                  >
                    Excluir ({selectedLeads.length})
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {leads.length} contato(s). O botão "Chamar" abre o WhatsApp com a conversa pronta —
              você fala com um de cada vez, pelo seu aparelho.
            </p>

            {leads.length > 0 && (
              <div className="flex items-center gap-2 mb-3 pl-1">
                <input
                  type="checkbox"
                  id="select-all-leads"
                  checked={selectedLeads.length === leads.length}
                  onChange={toggleAllLeads}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="select-all-leads" className="text-sm text-muted-foreground">
                  Selecionar todos
                </label>
              </div>
            )}

            <div className="space-y-3">
              {leads.map((lead, idx) => {
                const waLink = leadWhatsappLink(lead.phone, lead.name, lead.courseSlug);
                const isSelected = selectedLeads.includes(lead.id);
                return (
                  <div
                    key={idx}
                    className={`bg-card border rounded-xl p-4 sm:p-5 shadow-sm transition-colors ${
                      isSelected ? 'border-primary/40 bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLead(lead.id)}
                        className="mt-1.5 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="font-semibold text-foreground text-[16px]">{lead.name}</span>
                          {lead.phone && (
                            <span className="text-sm text-muted-foreground font-mono">{lead.phone}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(lead.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        {lead.message && (
                          <p className="mt-2.5 text-[15px] leading-relaxed text-foreground/90 border-l-2 border-accent pl-3 whitespace-pre-wrap">
                            {lead.message}
                          </p>
                        )}

                        {lead.historico && lead.historico.cursos?.length > 0 && (
                          <div className="mt-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                              Antes de deixar contato
                            </div>
                            <ul className="space-y-1">
                              {lead.historico.cursos.map((c: any) => (
                                <li key={c.courseSlug} className="text-[13px] text-foreground/90">
                                  <span className="font-mono text-accent">/{c.courseSlug}</span>
                                  {' — '}
                                  {c.concluiu ? (
                                    <span className="text-emerald-600 font-medium">concluiu</span>
                                  ) : c.moduloIndice < 0 ? (
                                    'só abriu'
                                  ) : (
                                    `leu até o módulo ${c.moduloIndice + 1}${c.totalModulos ? ` de ${c.totalModulos}` : ''}`
                                  )}
                                </li>
                              ))}
                            </ul>
                            <div className="mt-1.5 text-[12px] text-muted-foreground">
                              {lead.historico.visitas} {lead.historico.visitas === 1 ? 'visita' : 'visitas'}
                              {lead.historico.primeiroAcesso !== lead.historico.ultimoAcesso && (
                                <> · primeira em {new Date(lead.historico.primeiroAcesso).toLocaleDateString('pt-BR')}</>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          {lead.courseSlug && (
                            <span className="font-mono text-accent bg-accent/10 px-2 py-1 rounded">
                              /{lead.courseSlug}
                            </span>
                          )}
                          {lead.utmSource && (
                            <span className="text-muted-foreground bg-secondary px-2 py-1 rounded">
                              origem: {lead.utmSource}
                            </span>
                          )}
                          {lead.utmContent && (
                            <span className="text-muted-foreground bg-secondary px-2 py-1 rounded">
                              post: {lead.utmContent}
                            </span>
                          )}
                          {lead.moduleTitle && (
                            <span className="text-muted-foreground bg-secondary px-2 py-1 rounded">
                              parou em: {lead.moduleTitle}
                            </span>
                          )}
                        </div>
                      </div>

                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                        >
                          Chamar
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}

              {leads.length === 0 && (
                <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                  Nenhum lead capturado ainda.
                </div>
              )}
            </div>
          </div>
        ) : editingCourse ? (
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
            <div className="flex flex-wrap gap-3 mb-4">
              <label className="cursor-pointer bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 inline-block border border-border">
                Upload JSON
                <input 
                  type="file" 
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const content = evt.target?.result as string;
                        setEditJson(content);
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
              <button
                onClick={() => setEditJson('')}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 border border-border"
              >
                Limpar Texto
              </button>
              <button
                onClick={handleCopyJson}
                disabled={!editJson}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 border border-border disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {jsonCopied ? 'Copiado!' : 'Copiar JSON'}
              </button>
              <button
                onClick={handleDownloadJson}
                disabled={!editJson}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 border border-border disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Baixar JSON
              </button>
            </div>
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

            <datalist id="series-existentes">
              {series.map(nome => <option key={nome} value={nome} />)}
            </datalist>

            <p className="text-sm text-muted-foreground mb-6">
              A home mostra os cursos nesta mesma ordem, agrupados por série. Use as setas
              para reordenar e o campo "Série" para agrupar.
            </p>

            {gruposAdmin.map((grupo, gi) => (
            <section key={grupo.nome} className="mb-10">
              <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-border">
                <h2 className="font-serif text-xl text-primary">
                  {grupo.nome}
                  <span className="ml-2 text-sm font-sans text-muted-foreground">
                    ({grupo.cursos.length})
                  </span>
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => reordenar(moveSerie(courses, grupo.nome, -1))}
                    disabled={gi === 0 || salvandoOrdem}
                    aria-label={`Mover a série ${grupo.nome} para cima`}
                    className="h-9 w-9 rounded-lg border border-border bg-card text-sm disabled:opacity-30 hover:bg-secondary"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => reordenar(moveSerie(courses, grupo.nome, 1))}
                    disabled={gi === gruposAdmin.length - 1 || salvandoOrdem}
                    aria-label={`Mover a série ${grupo.nome} para baixo`}
                    className="h-9 w-9 rounded-lg border border-border bg-card text-sm disabled:opacity-30 hover:bg-secondary"
                  >
                    ↓
                  </button>
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grupo.cursos.map((course, ci) => (
                <div key={course.slug} className="bg-card border border-border rounded-xl p-6 flex flex-col">
                  <div className="mb-4">
                    {course.image ? (
                      <div className="relative">
                        <img
                          src={course.image}
                          alt=""
                          className="w-full aspect-[16/9] object-cover rounded-lg border border-border bg-secondary"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <label className="cursor-pointer bg-card/95 backdrop-blur border border-border px-3 py-1.5 rounded-md text-xs font-medium hover:bg-secondary">
                            Trocar
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadImage(course, file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <button
                            onClick={() => handleUpdateCourse(course, { image: '' })}
                            className="bg-card/95 backdrop-blur border border-red-200 text-red-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-50"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer w-full aspect-[16/9] rounded-lg border border-dashed border-border bg-secondary/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-secondary/50 transition-colors">
                        <span className="text-sm font-medium text-muted-foreground">
                          {uploadingSlug === course.slug ? 'Enviando...' : '+ Imagem do curso'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          PNG, JPG, WEBP ou GIF · ideal 1200×630
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          disabled={uploadingSlug === course.slug}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadImage(course, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <h3 className="text-xl font-serif text-primary mb-2">{course.courseName}</h3>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">{course.description}</p>
                  {/* No celular a linha do slug + os três botões não cabia
                      lado a lado: quebra em vez de empurrar a página. */}
                  <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-2 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 min-w-0">
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

                  <div className="mt-4 pt-4 border-t border-border">
                    <label
                      htmlFor={`serie-${course.slug}`}
                      className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2"
                    >
                      Série e posição
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id={`serie-${course.slug}`}
                        list="series-existentes"
                        defaultValue={course.category || ''}
                        placeholder="Ex: Como Precificar"
                        onBlur={(e) => {
                          const valor = e.target.value.trim();
                          if (valor !== (course.category || '')) {
                            handleUpdateCourse(course, { category: valor });
                          }
                        }}
                        className="flex-1 min-w-[160px] border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => reordenar(moveCursoNaSerie(courses, course.slug, -1))}
                        disabled={ci === 0 || salvandoOrdem}
                        aria-label={`Mover ${course.courseName} para cima`}
                        className="h-9 w-9 shrink-0 rounded-lg border border-border bg-card text-sm disabled:opacity-30 hover:bg-secondary"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => reordenar(moveCursoNaSerie(courses, course.slug, 1))}
                        disabled={ci === grupo.cursos.length - 1 || salvandoOrdem}
                        aria-label={`Mover ${course.courseName} para baixo`}
                        className="h-9 w-9 shrink-0 rounded-lg border border-border bg-card text-sm disabled:opacity-30 hover:bg-secondary"
                      >
                        ↓
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      Deixe em branco para o curso cair em "Outros cursos". Para mudar de
                      série, troque o nome aqui.
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <label
                      htmlFor={`capture-${course.slug}`}
                      className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2"
                    >
                      Cadastro (nome + telefone)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        id={`capture-${course.slug}`}
                        value={course.leadCapture || 'end'}
                        onChange={(e) =>
                          handleUpdateCourse(course, {
                            leadCapture: e.target.value as Course['leadCapture'],
                          })
                        }
                        className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none focus:border-primary"
                      >
                        <option value="none">Não pedir</option>
                        <option value="end">Só no fim (campo de dúvida)</option>
                        <option value="middle">Obrigatório no meio do curso</option>
                        <option value="start">Obrigatório antes de começar</option>
                      </select>

                      {course.leadCapture === 'middle' && (
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          após
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, course.modules?.length || 1)}
                            value={course.leadCaptureAfter ?? 2}
                            onChange={(e) =>
                              handleUpdateCourse(course, {
                                leadCaptureAfter: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="w-16 border border-border rounded-lg px-2 py-2 text-sm bg-background text-foreground outline-none focus:border-primary"
                          />
                          módulos
                        </label>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {CAPTURE_HELP[course.leadCapture || 'end']}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            </section>
            ))}

            {courses.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                Nenhum curso encontrado. Crie o seu primeiro curso!
              </div>
            )}
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

const aiPrompt = `Gere o conteúdo de um mini curso no formato JSON seguindo estritamente a estrutura abaixo. O JSON é importado numa plataforma web que renderiza cada bloco como um componente visual. Ele é lido principalmente NO CELULAR, por empresários sem formação contábil, que chegam pelo Instagram.

Crie um curso sobre [INSERIR TEMA AQUI].

TOM E TAMANHO (importante)
- Linguagem de conversa, segunda pessoa ("você"), frases curtas.
- Sem juridiquês. Se precisar usar um termo técnico, explique na mesma frase.
- Cada módulo deve ser lido em 1 a 2 minutos: de 4 a 8 blocos, parágrafos de no máximo 3 linhas.
- Entre 5 e 7 módulos no total.
- Nunca dois blocos de texto puro seguidos sem algo visual entre eles.
- Todo módulo deve ter pelo menos um bloco interativo ou visual (quiz, checklist, tabela, stats, comparison, calculator...).
- Feche cada módulo com uma conclusão prática: o que a pessoa faz com isso.

ESTRUTURA DO JSON
{
  "slug": "url-amigavel-do-curso",
  "courseName": "Nome do Curso",
  "description": "Uma frase dizendo o que a pessoa sai sabendo fazer.",
  "category": "Como Precificar",                 // série: a home agrupa os cursos por esse nome
  "image": "/uploads/capa.png",                  // capa do curso (envie pelo painel)
  "ogImage": "https://.../capa-1200x630.png",   // opcional: imagem do preview do link
  "leadCapture": "end",                          // "end" (padrão), "middle", "start" ou "none"
  "leadCaptureAfter": 2,                         // só com "middle": módulos abertos antes do cadastro
  "modules": [ ... ]
}

Cada módulo:
{
  "id": "identificador-unico",
  "shortTitle": "Título curto (máx. 3 palavras — aparece no menu e nos chips do celular)",
  "kicker": "MÓDULO 01 · CATEGORIA",
  "title": "Título principal do módulo",
  "summary": "Uma frase resumindo o que a pessoa vai entender aqui.",
  "content": [ ... blocos ... ]
}

BLOCOS DISPONÍVEIS
Use APENAS os tipos abaixo. Qualquer outro tipo é ignorado e não aparece na tela.

--- TEXTO ---

1. Parágrafo:
{ "type": "paragraph", "text": "Texto do parágrafo. URLs viram links automaticamente." }

2. Subtítulo:
{ "type": "heading", "text": "Subtítulo da seção" }

3. Lista com bullets:
{ "type": "list", "items": ["Item 1", "Item 2"] }

4. Frase de impacto (itálico com borda lateral):
{ "type": "highlight", "text": "A frase que você quer que a pessoa lembre." }

5. Citação / depoimento:
{ "type": "quote", "text": "Frase citada.", "author": "Nome", "role": "Cargo ou empresa" }

6. Linha divisória:
{ "type": "divider" }

--- DESTAQUE ---

7. Callout (caixa com título e itens). O "tone" muda a cor:
   "info" (padrão, laranja) · "warning" (âmbar) · "danger" (vermelho) · "success" (verde)
{ "type": "callout", "tone": "warning", "title": "ATENÇÃO", "items": ["Regra 1", "Regra 2"] }

8. Números em destaque (cards grandes, 2 por linha no celular):
{ "type": "stats", "items": [ { "value": "R$ 1.518", "label": "Salário mínimo", "hint": "vigente em 2026" } ] }

--- ESTRUTURA ---

9. Passo a passo numerado:
{ "type": "steps", "items": [ { "title": "Abra o portal", "text": "Detalhe opcional." } ] }

10. Linha do tempo:
{ "type": "timeline", "items": [ { "year": "2026", "text": "O que acontece" } ] }

11. Tabela (rola de lado no celular):
{ "type": "table", "headers": ["Anexo", "Alíquota"], "rows": [["III", "6%"], ["V", "15,5%"]], "caption": "Legenda opcional" }

12. Comparação lado a lado:
{ "type": "comparison", "columns": [ { "label": "Certo", "tone": "positive", "items": ["Faça isso"] }, { "label": "Errado", "tone": "negative", "items": ["Não faça isso"] } ] }
    tone aceita: "positive" · "negative" · "neutral"

13. Perguntas frequentes (sanfona, fechada por padrão — ótima para detalhe que nem todo mundo precisa ler):
{ "type": "accordion", "items": [ { "title": "E se eu tiver duas empresas?", "text": "Resposta." } ] }

--- INTERATIVO ---

14. Quiz de múltipla escolha ("correct" é o índice, começando em 0):
{ "type": "quiz", "question": "Qual o prazo do DAS?", "options": ["Dia 10", "Dia 20", "Último dia útil"], "correct": 1, "explanation": "Por que a resposta certa é essa." }

15. Checklist que a pessoa marca:
{ "type": "checklist", "items": ["Separar a conta PJ", "Guardar as notas"] }

16. Exercício de classificação:
{ "type": "classify-exercise", "items": ["Aluguel", "Comissão"], "categories": ["Fixo", "Variável"], "answerKey": { "Aluguel": "Fixo", "Comissão": "Variável" } }

17. Calculadora. Os "id" dos campos viram as variáveis da fórmula:
{
  "type": "calculator",
  "fields": [
    { "id": "receita", "label": "Receita Bruta (R$)", "type": "currency", "placeholder": "0,00" },
    { "id": "aliquota", "label": "Alíquota (%)", "type": "percentage" }
  ],
  "formula": "receita * (aliquota / 100)",
  "resultLabel": "Imposto Estimado",
  "resultFormat": "currency"
}
   - field.type: "currency" · "percentage" · "number" · "select" (com "options": [...]) · "text"
   - resultFormat: "currency" · "percentage" · "number" · "object"
   - Para vários resultados de uma vez, use resultFormat "object", uma fórmula com
     várias linhas terminando em return, e descreva cada chave em resultFields:
     "formula": "const base = receita * 0.28; const inss = base * 0.11; return { base, inss };",
     "resultFormat": "object",
     "resultFields": [ { "key": "base", "label": "Base de cálculo", "format": "currency" },
                       { "key": "inss", "label": "INSS", "format": "currency" } ]
   - Uma chave chamada "aviso" vira uma faixa de alerta ocupando a linha inteira.

18. Fórmula matemática (LaTeX):
{ "type": "math", "expression": "Fator R = \\\\frac{Folha}{Receita}", "inline": false }

--- MÍDIA ---

19. Vídeo (aceita link normal do YouTube, Shorts ou Vimeo):
{ "type": "video", "url": "https://youtu.be/XXXXXXX", "caption": "Legenda opcional" }

20. Imagem:
{ "type": "image", "url": "https://.../imagem.png", "alt": "Descrição", "caption": "Legenda opcional" }

21. Botão para link externo (ex: calculadora, formulário, planilha):
{ "type": "cta", "text": "Simule o seu caso na calculadora.", "buttonLabel": "Abrir calculadora", "url": "https://calculadora.virgulacontabil.com.br" }

--- GRÁFICOS ---

22. Ponto de equilíbrio:
{ "type": "breakeven-chart", "custoFixo": 10000, "custoVariavelUnitario": 50, "precoVenda": 100, "quantidadeMaxima": 500 }

23. Pizza de composição de custos:
{ "type": "breakdown-chart", "total": 15000, "parts": [ { "label": "Impostos", "value": 3000 }, { "label": "Folha", "value": 12000 } ] }

24. Cenários de custo:
{ "type": "scenario-chart", "custoFixo": 5000, "custoVariavelUnitario": 20, "qtdMin": 100, "qtdMax": 1000 }

O QUE NÃO PRECISA COLOCAR
- Não crie módulo de certificado, de conclusão nem de "fale conosco": a plataforma
  já mostra, no fim do último módulo, o aviso de curso concluído e o campo de
  dúvida que abre o WhatsApp.
- Não peça nome nem telefone dentro do conteúdo.

REGRAS FINAIS
- Responda APENAS com o JSON válido, sem texto antes ou depois.
- Não invente tipos de bloco fora da lista acima.
- Valores em reais sempre como número puro no JSON (15000, nunca "R$ 15.000").
- Barras invertidas do LaTeX precisam vir escapadas (\\\\frac, \\\\times).`;
