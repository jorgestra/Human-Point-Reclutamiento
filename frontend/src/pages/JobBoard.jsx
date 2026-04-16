import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest, formatCurrency, formatDate, JOB_TYPES, SOURCE_OPTIONS } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  ArrowLeft,
  Send,
  CheckCircle,
  Plus,
  X
} from 'lucide-react';

const LOGO_URL = null; // Logo gestionado inline

// Public Job Board
export const JobBoard = () => {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadVacancies();
  }, []);

  const loadVacancies = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/vacancies/public?tenant_id=default`);
      const data = await response.json();
      setVacancies(Array.isArray(data) ? data : (data.items || []));
    } catch (error) {
      console.error('Error loading vacancies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="job-board-page">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:"linear-gradient(135deg,#004aad,#38b6ff)"}}><span className="text-white font-bold text-sm">HP</span></div><span className="text-white font-bold text-lg">Human Point</span></div>
          <Button variant="outline" onClick={() => navigate('/login')}>
            Portal de Reclutadores
          </Button>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold font-['Manrope'] mb-4">
            Únete a Nuestro Equipo
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Explora las oportunidades disponibles y da el siguiente paso en tu carrera
          </p>
        </div>
      </div>

      {/* Vacancies List */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">
          Vacantes Disponibles ({vacancies.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vacancies.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center text-slate-400">
              No hay vacantes disponibles en este momento
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {vacancies.map((vacancy) => (
              <Card 
                key={vacancy.id}
                className="border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/jobs/${vacancy.id}`)}
                data-testid={`job-card-${vacancy.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-slate-900">{vacancy.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          {vacancy.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase size={14} />
                          {JOB_TYPES.find(t => t.value === vacancy.job_type)?.label || vacancy.job_type}
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600">
                          <DollarSign size={14} />
                          {formatCurrency(vacancy.salary_min)} - {formatCurrency(vacancy.salary_max)}
                        </div>
                      </div>
                    </div>
                    <Button className="bg-cyan-600 hover:bg-cyan-700">
                      Ver Detalles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex flex-col items-center mb-2"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:"linear-gradient(135deg,#004aad,#38b6ff)"}}><span className="text-white font-bold">HP</span></div><span className="font-bold text-slate-900 mt-1">Human Point</span></div>
          <p className="text-sm">© 2024 Human Point. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

// Job Detail Page
export const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: '',
    expected_salary: '',
    linkedin_url: '',
    skills: '',
    source: 'portal',
    notes: '',
    experience: [],
    education: []
  });

  const [newExp, setNewExp] = useState({ company: '', position: '', start_date: '', end_date: '', is_current: false, description: '' });
  const [newEdu, setNewEdu] = useState({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' });
  const [formTab, setFormTab] = useState('personal');
  const [cvFile, setCvFile] = useState(null);
  const cvRef = React.useRef(null);

  const loadVacancy = React.useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/vacancies/public/${id}?tenant_id=default`);
      if (!response.ok) throw new Error('Vacancy not found');
      const data = await response.json();
      setVacancy(data);
    } catch (error) {
      console.error('Error loading vacancy:', error);
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadVacancy();
  }, [loadVacancy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const candidateData = {
        ...formData,
        expected_salary: formData.expected_salary ? parseFloat(formData.expected_salary) : null,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        experience: formData.experience,
        education: formData.education
      };

      let response;

      if (cvFile) {
        // Use multipart endpoint when CV is provided
        const form = new FormData();
        form.append('cv_file', cvFile);
        form.append('application_data', JSON.stringify({ vacancy_id: id, candidate_data: candidateData }));
        response = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/public/apply-with-cv/${id}?tenant_id=default`,
          { method: 'POST', body: form }
        );
      } else {
        // Standard JSON endpoint
        response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/applications/public?tenant_id=default`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vacancy_id: id, candidate_data: candidateData })
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al enviar aplicación');
      }

      setSubmitted(true);
      toast.success('¡Aplicación enviada exitosamente!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!vacancy) return null;

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Aplicación Enviada!</h2>
            <p className="text-slate-600 mb-6">
              Gracias por tu interés en unirte a nuestro equipo. Revisaremos tu perfil y te contactaremos pronto.
            </p>
            <Button onClick={() => navigate('/jobs')} className="bg-cyan-600 hover:bg-cyan-700">
              Ver Más Vacantes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="job-detail-page">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:"linear-gradient(135deg,#004aad,#38b6ff)"}}><span className="text-white font-bold text-sm">HP</span></div><span className="text-white font-bold text-lg">Human Point</span></div>
          <Button variant="ghost" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="mr-2" size={16} />
            Volver a Vacantes
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold mb-2">{vacancy.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        {vacancy.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase size={14} />
                        {JOB_TYPES.find(t => t.value === vacancy.job_type)?.label || vacancy.job_type}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-cyan-50 text-cyan-700">Activa</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Descripción</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{vacancy.description}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Requisitos</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{vacancy.requirements}</p>
                </div>

                {vacancy.benefits && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Beneficios</h3>
                    <p className="text-slate-600 whitespace-pre-wrap">{vacancy.benefits}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border-slate-200 sticky top-24">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-emerald-600">
                  <DollarSign size={20} />
                  {formatCurrency(vacancy.salary_min)} - {formatCurrency(vacancy.salary_max)}
                </div>
                
                {vacancy.deadline && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock size={14} />
                    Fecha límite: {formatDate(vacancy.deadline)}
                  </div>
                )}

                <Button 
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => setShowForm(true)}
                  data-testid="apply-button"
                >
                  <Send className="mr-2" size={16} />
                  Aplicar Ahora
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Application Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Aplicar a: {vacancy.title}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                  <ArrowLeft size={16} />
                </Button>
              </div>
              {/* Form Tabs */}
              <div className="flex gap-2 mt-3">
                {[
                  { key: 'personal', label: 'Datos Personales' },
                  { key: 'experience', label: `Experiencia (${formData.experience.length})` },
                  { key: 'education', label: `Educación (${formData.education.length})` }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFormTab(tab.key)}
                    className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                      formTab === tab.key
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Personal Data Tab */}
                {formTab === 'personal' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre *</Label>
                        <Input
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          required
                          data-testid="apply-firstname-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Apellido *</Label>
                        <Input
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          required
                          data-testid="apply-lastname-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        data-testid="apply-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        data-testid="apply-phone-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ubicación</Label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        data-testid="apply-location-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expectativa Salarial</Label>
                      <Input
                        type="number"
                        value={formData.expected_salary}
                        onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value })}
                        data-testid="apply-salary-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>LinkedIn URL</Label>
                      <Input
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                        data-testid="apply-linkedin-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Habilidades</Label>
                      <Input
                        value={formData.skills}
                        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                        placeholder="React, Node.js, Python..."
                        data-testid="apply-skills-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>¿Por qué te interesa esta posición?</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        data-testid="apply-notes-input"
                      />
                    </div>
                    {/* CV Upload */}
                    <div className="space-y-2">
                      <Label>Curriculum Vitae (PDF, máx 2 MB)</Label>
                      <input
                        ref={cvRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files[0];
                          if (!f) return;
                          if (f.type !== 'application/pdf') { alert('Solo se permiten archivos PDF'); return; }
                          if (f.size > 2 * 1024 * 1024) { alert('El archivo no puede superar 2 MB'); return; }
                          setCvFile(f);
                        }}
                        data-testid="portal-cv-input"
                      />
                      <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" size="sm" onClick={() => cvRef.current?.click()} data-testid="portal-cv-btn">
                          {cvFile ? cvFile.name : 'Adjuntar CV (opcional)'}
                        </Button>
                        {cvFile && (
                          <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => { setCvFile(null); if (cvRef.current) cvRef.current.value = ''; }}>
                            <X size={13} />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">Solo PDF, máximo 2 MB</p>
                    </div>
                  </>
                )}

                {/* Experience Tab */}
                {formTab === 'experience' && (
                  <div className="space-y-4">
                    {/* Existing experience entries */}
                    {formData.experience.map((exp, i) => (
                      <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-slate-900">{exp.position}</p>
                            <p className="text-sm text-slate-600">{exp.company}</p>
                            <p className="text-xs text-slate-400">{exp.start_date} – {exp.is_current ? 'Presente' : exp.end_date}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => setFormData({ ...formData, experience: formData.experience.filter((_, idx) => idx !== i) })}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                        {exp.description && <p className="text-sm text-slate-500">{exp.description}</p>}
                      </div>
                    ))}

                    {/* Add new experience */}
                    <div className="border border-dashed border-slate-300 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-medium text-slate-700">Agregar Experiencia</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Empresa *</Label>
                          <Input
                            size="sm"
                            value={newExp.company}
                            onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                            placeholder="Nombre de empresa"
                            data-testid="exp-company-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Cargo *</Label>
                          <Input
                            value={newExp.position}
                            onChange={(e) => setNewExp({ ...newExp, position: e.target.value })}
                            placeholder="Tu cargo"
                            data-testid="exp-position-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fecha Inicio</Label>
                          <Input
                            type="month"
                            value={newExp.start_date}
                            onChange={(e) => setNewExp({ ...newExp, start_date: e.target.value })}
                            data-testid="exp-start-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fecha Fin</Label>
                          <Input
                            type="month"
                            value={newExp.end_date}
                            onChange={(e) => setNewExp({ ...newExp, end_date: e.target.value })}
                            disabled={newExp.is_current}
                            data-testid="exp-end-input"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          id="is_current"
                          checked={newExp.is_current}
                          onChange={(e) => setNewExp({ ...newExp, is_current: e.target.checked, end_date: '' })}
                          className="rounded"
                        />
                        <label htmlFor="is_current" className="text-slate-600">Trabajo actual</label>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descripción</Label>
                        <Textarea
                          value={newExp.description}
                          onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                          rows={2}
                          placeholder="Descripción de responsabilidades..."
                          data-testid="exp-description-input"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!newExp.company || !newExp.position) return;
                          setFormData({ ...formData, experience: [...formData.experience, { ...newExp }] });
                          setNewExp({ company: '', position: '', start_date: '', end_date: '', is_current: false, description: '' });
                        }}
                        data-testid="add-exp-btn"
                      >
                        <Plus size={14} className="mr-1" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Education Tab */}
                {formTab === 'education' && (
                  <div className="space-y-4">
                    {formData.education.map((edu, i) => (
                      <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{edu.degree}</p>
                            <p className="text-sm text-slate-600">{edu.institution}</p>
                            <p className="text-xs text-slate-500">{edu.field_of_study}</p>
                            <p className="text-xs text-slate-400">{edu.start_date} – {edu.end_date || 'Presente'}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => setFormData({ ...formData, education: formData.education.filter((_, idx) => idx !== i) })}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="border border-dashed border-slate-300 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-medium text-slate-700">Agregar Educación</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Institución *</Label>
                          <Input
                            value={newEdu.institution}
                            onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                            placeholder="Universidad / Instituto"
                            data-testid="edu-institution-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Grado / Título *</Label>
                          <Input
                            value={newEdu.degree}
                            onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                            placeholder="Lic., Ing., Maestría..."
                            data-testid="edu-degree-input"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Campo de Estudio</Label>
                          <Input
                            value={newEdu.field_of_study}
                            onChange={(e) => setNewEdu({ ...newEdu, field_of_study: e.target.value })}
                            placeholder="Ej: Ingeniería en Sistemas"
                            data-testid="edu-field-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Año Inicio</Label>
                          <Input
                            type="month"
                            value={newEdu.start_date}
                            onChange={(e) => setNewEdu({ ...newEdu, start_date: e.target.value })}
                            data-testid="edu-start-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Año Fin</Label>
                          <Input
                            type="month"
                            value={newEdu.end_date}
                            onChange={(e) => setNewEdu({ ...newEdu, end_date: e.target.value })}
                            data-testid="edu-end-input"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!newEdu.institution || !newEdu.degree) return;
                          setFormData({ ...formData, education: [...formData.education, { ...newEdu }] });
                          setNewEdu({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' });
                        }}
                        data-testid="add-edu-btn"
                      >
                        <Plus size={14} className="mr-1" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                    disabled={submitting}
                    data-testid="apply-submit-button"
                  >
                    {submitting ? 'Enviando...' : 'Enviar Aplicación'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
