import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest, API_URL, getToken, formatCurrency, formatDate, PIPELINE_STAGES, SOURCE_OPTIONS } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Filter,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Briefcase,
  GraduationCap,
  Link as LinkIcon,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Calendar,
  FileText,
  ArrowLeft,
  Upload,
  Download,
  X,
  PaperclipIcon,
  Building2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

// List View Component
export const Candidates = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [professionalLevels, setProfessionalLevels] = useState([]);
  const [professionalAreas, setProfessionalAreas] = useState([]);
  const [languages, setLanguages] = useState([]);

  const initialFormState = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    portfolio_url: '',
    location: '',
    expected_salary: '',
    salary_currency: 'GTQ',
    skills: [],
    source: 'portal',
    notes: '',
    experience: [],
    education: [],
    candidate_status: 'available',
    experience_range: '',
    professional_level_id: '',
    professional_area_ids: [],
    language_ids: []
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formTab, setFormTab] = useState('personal');
  const [newExp, setNewExp] = useState({ company: '', position: '', start_date: '', end_date: '', is_current: false, description: '' });
  const [newEdu, setNewEdu] = useState({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' });
  const cvInputRef = useRef(null);
  const [cvFile, setCvFile] = useState(null);

  const loadCandidates = React.useCallback(async () => {
    try {
      let endpoint = '/candidates?limit=100';
      if (sourceFilter !== 'all') endpoint += `&source=${sourceFilter}`;
      if (search) endpoint += `&search=${encodeURIComponent(search)}`;
      
      const data = await apiRequest(endpoint);
      setCandidates(data.items || []);
    } catch (error) {
      console.error('Error loading candidates:', error);
      toast.error('Error al cargar candidatos');
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, search]);

  useEffect(() => {
    loadCandidates();
    // Cargar catálogos para el formulario de creación
    Promise.all([
      apiRequest('/catalogs/professional-levels'),
      apiRequest('/catalogs/professional-areas'),
      apiRequest('/catalogs/languages')
    ]).then(([levels, areas, langs]) => {
      setProfessionalLevels(levels || []);
      setProfessionalAreas(areas || []);
      setLanguages(langs || []);
    }).catch(console.error);
  }, [loadCandidates]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setFormData(initialFormState);
      setShowForm(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        expected_salary: formData.expected_salary ? parseFloat(formData.expected_salary) : null,
        skills: Array.isArray(formData.skills) ? formData.skills : formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        experience: formData.experience,
        education: formData.education,
        professional_level_id: formData.professional_level_id || null,
        experience_range: formData.experience_range || null,
        candidate_status: formData.candidate_status || 'available'
      };

      // Quitar campos que no van en el POST principal
      delete payload.professional_area_ids;
      delete payload.language_ids;

      const res = await apiRequest('/candidates', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Sync áreas profesionales
      if (formData.professional_area_ids?.length > 0 && res.id) {
        await apiRequest(`/candidates/${res.id}/areas/sync`, {
          method: 'PUT',
          body: JSON.stringify(formData.professional_area_ids)
        });
      }

      // Sync idiomas
      if (formData.language_ids?.length > 0 && res.id) {
        await apiRequest(`/candidates/${res.id}/languages/sync`, {
          method: 'PUT',
          body: JSON.stringify(formData.language_ids)
        });
      }

      // Upload CV if provided
      if (cvFile && res.id) {
        const token = getToken();
        const form = new FormData();
        form.append('file', cvFile);
        await fetch(`${API_URL}/candidates/${res.id}/upload?file_type=cv`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        });
      }

      toast.success('Candidato creado');
      setShowForm(false);
      setFormData(initialFormState);
      setCvFile(null);
      setFormTab('personal');
      loadCandidates();
    } catch (error) {
      toast.error(error.message || 'Error al crear candidato');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este candidato?')) return;
    try {
      await apiRequest(`/candidates/${id}`, { method: 'DELETE' });
      toast.success('Candidato eliminado');
      loadCandidates();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="space-y-6" data-testid="candidates-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Candidatos</h1>
          <p className="text-slate-500 mt-1">Base de datos de candidatos</p>
        </div>
        <Button 
          onClick={() => { setFormData(initialFormState); setShowForm(true); }}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="new-candidate-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Candidato
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-48" data-testid="source-filter">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Fuente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fuentes</SelectItem>
                {SOURCE_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead>Experiencia</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Áreas</TableHead>
                <TableHead>Idiomas</TableHead>
                <TableHead>Expectativa</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : candidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                    No hay candidatos
                  </TableCell>
                </TableRow>
              ) : (
                candidates.map((candidate) => (
                  <TableRow 
                    key={candidate.id} 
                    className="hover:bg-slate-50 cursor-pointer" 
                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                    data-testid={`candidate-row-${candidate.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-slate-100 text-slate-600">
                            {getInitials(candidate.first_name, candidate.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-900">
                            {candidate.first_name} {candidate.last_name}
                          </p>
                          <p className="text-xs text-slate-400">{candidate.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        candidate.candidate_status === 'available' ? 'bg-green-50 text-green-700' :
                        candidate.candidate_status === 'disqualified' ? 'bg-red-50 text-red-700' :
                        candidate.candidate_status === 'talent_pool' ? 'bg-blue-50 text-blue-700' :
                        candidate.candidate_status === 'no_response' ? 'bg-amber-50 text-amber-700' :
                        candidate.candidate_status === 'rejected_offer' ? 'bg-purple-50 text-purple-700' :
                        'bg-slate-100 text-slate-600'
                      }>
                        {candidate.candidate_status === 'available' ? 'Disponible' :
                         candidate.candidate_status === 'disqualified' ? 'Descalificado' :
                         candidate.candidate_status === 'talent_pool' ? 'Talent Pool' :
                         candidate.candidate_status === 'no_response' ? 'No responde' :
                         candidate.candidate_status === 'rejected_offer' ? 'Rechazó' :
                         'Disponible'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {candidate.experience_range ? (
                        <span className="text-sm text-slate-600">{candidate.experience_range} años</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{candidate.professional_level_name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500 max-w-[100px] truncate block" title={candidate.professional_areas_text}>
                        {candidate.professional_areas_text || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500 max-w-[80px] truncate block" title={candidate.languages_text}>
                        {candidate.languages_text || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {candidate.expected_salary ? (
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-emerald-500" />
                          {formatCurrency(candidate.expected_salary)}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDate(candidate.created_at)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`candidate-menu-${candidate.id}`}>
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/candidates/${candidate.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(candidate.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setFormTab('personal'); setCvFile(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Candidato</DialogTitle>
          </DialogHeader>
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-100 pb-2">
            {[
              { key: 'personal', label: 'Datos Personales' },
              { key: 'experience', label: `Experiencia (${formData.experience.length})` },
              { key: 'education', label: `Educación (${formData.education.length})` }
            ].map(tab => (
              <button key={tab.key} type="button" onClick={() => setFormTab(tab.key)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${formTab === tab.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formTab === 'personal' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required data-testid="candidate-firstname-input" />
                </div>
                <div className="space-y-2">
                  <Label>Apellido *</Label>
                  <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required data-testid="candidate-lastname-input" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required data-testid="candidate-email-input" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} data-testid="candidate-phone-input" />
                </div>
                <div className="space-y-2">
                  <Label>Ubicación</Label>
                  <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} data-testid="candidate-location-input" />
                </div>
                <div className="space-y-2">
                  <Label>Expectativa Salarial</Label>
                  <div className="flex gap-2">
                    <Select value={formData.salary_currency} onValueChange={(v) => setFormData({ ...formData, salary_currency: v })}>
                      <SelectTrigger className="w-24" data-testid="candidate-currency-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GTQ">GTQ</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" className="flex-1" value={formData.expected_salary} onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value })} data-testid="candidate-salary-input" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input value={formData.linkedin_url} onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." data-testid="candidate-linkedin-input" />
                </div>
                <div className="space-y-2">
                  <Label>Portafolio</Label>
                  <Input value={formData.portfolio_url} onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })} placeholder="https://..." data-testid="candidate-portfolio-input" />
                </div>
                <div className="space-y-2">
                  <Label>Fuente *</Label>
                  <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                    <SelectTrigger data-testid="candidate-source-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{SOURCE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={formData.candidate_status} onValueChange={(v) => setFormData({ ...formData, candidate_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponible</SelectItem>
                      <SelectItem value="talent_pool">Talent Pool</SelectItem>
                      <SelectItem value="no_response">No responde</SelectItem>
                      <SelectItem value="disqualified">Descalificado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rango de Experiencia</Label>
                  <Select value={formData.experience_range} onValueChange={(v) => setFormData({ ...formData, experience_range: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-2">0-2 años</SelectItem>
                      <SelectItem value="3-5">3-5 años</SelectItem>
                      <SelectItem value="5-10">5-10 años</SelectItem>
                      <SelectItem value="+10">+10 años</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nivel Profesional</Label>
                  <Select value={formData.professional_level_id} onValueChange={(v) => setFormData({ ...formData, professional_level_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {professionalLevels.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Áreas Profesionales</Label>
                  <div className="flex flex-wrap gap-2 min-h-[36px] border border-slate-200 rounded-md p-2">
                    {formData.professional_area_ids.map(id => {
                      const area = professionalAreas.find(a => a.id === id);
                      return area ? (
                        <span key={id} className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 text-xs px-2 py-1 rounded-full">
                          {area.name}
                          <button type="button" onClick={() => setFormData({ ...formData, professional_area_ids: formData.professional_area_ids.filter(a => a !== id) })} className="text-cyan-500 hover:text-cyan-700">×</button>
                        </span>
                      ) : null;
                    })}
                    <Select onValueChange={(v) => { if (!formData.professional_area_ids.includes(v)) setFormData({ ...formData, professional_area_ids: [...formData.professional_area_ids, v] }); }}>
                      <SelectTrigger className="h-6 w-auto border-dashed text-xs px-2"><SelectValue placeholder="+ Agregar área" /></SelectTrigger>
                      <SelectContent>{professionalAreas.filter(a => !formData.professional_area_ids.includes(a.id)).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Idiomas</Label>
                  <div className="flex flex-wrap gap-2 min-h-[36px] border border-slate-200 rounded-md p-2">
                    {formData.language_ids.map(id => {
                      const lang = languages.find(l => l.id === id);
                      return lang ? (
                        <span key={id} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full">
                          {lang.name} {lang.level ? `(${lang.level})` : ''}
                          <button type="button" onClick={() => setFormData({ ...formData, language_ids: formData.language_ids.filter(l => l !== id) })} className="text-purple-500 hover:text-purple-700">×</button>
                        </span>
                      ) : null;
                    })}
                    <Select onValueChange={(v) => { if (!formData.language_ids.includes(v)) setFormData({ ...formData, language_ids: [...formData.language_ids, v] }); }}>
                      <SelectTrigger className="h-6 w-auto border-dashed text-xs px-2"><SelectValue placeholder="+ Agregar idioma" /></SelectTrigger>
                      <SelectContent>{languages.filter(l => !formData.language_ids.includes(l.id)).map(l => <SelectItem key={l.id} value={l.id}>{l.name} {l.level ? `(${l.level})` : ''}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Habilidades</Label>
                  <div className="flex flex-wrap gap-2 min-h-[36px] border border-slate-200 rounded-md p-2">
                    {(formData.skills || []).map((skill, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full">
                        {skill}
                        <button type="button" onClick={() => setFormData({ ...formData, skills: formData.skills.filter((_, idx) => idx !== i) })} className="text-slate-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="Escribir habilidad + Enter"
                      className="text-xs border-none outline-none bg-transparent flex-1 min-w-[150px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val && !formData.skills.includes(val)) {
                            setFormData({ ...formData, skills: [...(formData.skills || []), val] });
                            e.target.value = '';
                          }
                        }
                      }}
                      data-testid="candidate-skills-input"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Presiona Enter o coma para agregar cada habilidad</p>
                </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Notas</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} data-testid="candidate-notes-input" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Curriculum Vitae (PDF, máx 2 MB)</Label>
                  <div className="flex items-center gap-3">
                    <input ref={cvInputRef} type="file" accept=".pdf" className="hidden" onChange={e => {
                      const f = e.target.files[0];
                      if (f && f.type !== 'application/pdf') { toast.error('Solo se permiten archivos PDF'); return; }
                      if (f && f.size > 2 * 1024 * 1024) { toast.error('El archivo no puede superar 2 MB'); return; }
                      setCvFile(f || null);
                    }} data-testid="cv-file-input" />
                    <Button type="button" variant="outline" size="sm" onClick={() => cvInputRef.current?.click()} data-testid="cv-upload-btn">
                      <Upload size={13} className="mr-1.5" /> {cvFile ? cvFile.name : 'Seleccionar CV'}
                    </Button>
                    {cvFile && <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => { setCvFile(null); if (cvInputRef.current) cvInputRef.current.value = ''; }}><X size={13} /></Button>}
                  </div>
                </div>
              </div>
            )}
            {formTab === 'experience' && (
              <div className="space-y-4">
                {formData.experience.map((exp, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{exp.position}</p>
                      <p className="text-xs text-slate-600">{exp.company}</p>
                      <p className="text-xs text-slate-400">{exp.start_date} – {exp.is_current ? 'Presente' : exp.end_date}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => setFormData({ ...formData, experience: formData.experience.filter((_, idx) => idx !== i) })}><X size={14} /></Button>
                  </div>
                ))}
                <div className="border border-dashed border-slate-300 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-slate-700">Agregar Experiencia</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Empresa *</Label><Input value={newExp.company} onChange={e => setNewExp({ ...newExp, company: e.target.value })} placeholder="Empresa" data-testid="exp-company-input" /></div>
                    <div className="space-y-1"><Label className="text-xs">Cargo *</Label><Input value={newExp.position} onChange={e => setNewExp({ ...newExp, position: e.target.value })} placeholder="Cargo" data-testid="exp-position-input" /></div>
                    <div className="space-y-1"><Label className="text-xs">Inicio</Label><Input type="month" value={newExp.start_date} onChange={e => setNewExp({ ...newExp, start_date: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Fin</Label><Input type="month" value={newExp.end_date} onChange={e => setNewExp({ ...newExp, end_date: e.target.value })} disabled={newExp.is_current} /></div>
                  </div>
                  <div className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newExp.is_current} onChange={e => setNewExp({ ...newExp, is_current: e.target.checked, end_date: '' })} className="rounded" /><span className="text-slate-600">Trabajo actual</span></div>
                  <Textarea value={newExp.description} onChange={e => setNewExp({ ...newExp, description: e.target.value })} rows={2} placeholder="Descripción..." />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    if (!newExp.company || !newExp.position) return;
                    setFormData({ ...formData, experience: [...formData.experience, { ...newExp }] });
                    setNewExp({ company: '', position: '', start_date: '', end_date: '', is_current: false, description: '' });
                  }} data-testid="add-exp-btn"><Plus size={13} className="mr-1" />Agregar</Button>
                </div>
              </div>
            )}
            {formTab === 'education' && (
              <div className="space-y-4">
                {formData.education.map((edu, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{edu.degree}</p>
                      <p className="text-xs text-slate-600">{edu.institution}</p>
                      <p className="text-xs text-slate-400">{edu.field_of_study}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => setFormData({ ...formData, education: formData.education.filter((_, idx) => idx !== i) })}><X size={14} /></Button>
                  </div>
                ))}
                <div className="border border-dashed border-slate-300 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-slate-700">Agregar Educación</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Institución *</Label><Input value={newEdu.institution} onChange={e => setNewEdu({ ...newEdu, institution: e.target.value })} placeholder="Universidad..." data-testid="edu-institution-input" /></div>
                    <div className="space-y-1"><Label className="text-xs">Grado / Título *</Label><Input value={newEdu.degree} onChange={e => setNewEdu({ ...newEdu, degree: e.target.value })} placeholder="Lic., Ing., MSc..." data-testid="edu-degree-input" /></div>
                    <div className="col-span-2 space-y-1"><Label className="text-xs">Campo de Estudio</Label><Input value={newEdu.field_of_study} onChange={e => setNewEdu({ ...newEdu, field_of_study: e.target.value })} placeholder="Ingeniería en Sistemas..." /></div>
                    <div className="space-y-1"><Label className="text-xs">Inicio</Label><Input type="month" value={newEdu.start_date} onChange={e => setNewEdu({ ...newEdu, start_date: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Fin</Label><Input type="month" value={newEdu.end_date} onChange={e => setNewEdu({ ...newEdu, end_date: e.target.value })} /></div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    if (!newEdu.institution || !newEdu.degree) return;
                    setFormData({ ...formData, education: [...formData.education, { ...newEdu }] });
                    setNewEdu({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' });
                  }} data-testid="add-edu-btn"><Plus size={13} className="mr-1" />Agregar</Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="candidate-submit-btn">Crear Candidato</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Detail View Component
export const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Experience CRUD states
  const [showExpDialog, setShowExpDialog] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [expFormData, setExpFormData] = useState({ company: '', position: '', start_date: '', end_date: '', is_current: false, description: '' });
  
  // Education CRUD states
  const [showEduDialog, setShowEduDialog] = useState(false);
  const [editingEdu, setEditingEdu] = useState(null);
  const [eduFormData, setEduFormData] = useState({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' });
  
  // Link to vacancy states
  const [showLinkVacancyDialog, setShowLinkVacancyDialog] = useState(false);
  const [vacancies, setVacancies] = useState([]);
  const [selectedVacancy, setSelectedVacancy] = useState('');

  // Create Interview states
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [hrPersonnel, setHrPersonnel] = useState([]);
  const [interviewForm, setInterviewForm] = useState({
    application_id: '',
    scheduled_date: '',
    scheduled_time: '10:00',
    duration_minutes: 60,
    interview_type: 'hr',
    interviewer_id: '',
    location: '',
    meeting_link: '',
    notes: ''
  });

  // Catalogs for candidate edit
  const [professionalLevels, setProfessionalLevels] = useState([]);
  const [professionalAreas, setProfessionalAreas] = useState([]);
  const [languages, setLanguages] = useState([]);

  // Interview history
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);

  const CANDIDATE_STATUS_OPTIONS = [
    { value: 'available', label: 'Disponible' },
    { value: 'disqualified', label: 'Descalificado' },
    { value: 'talent_pool', label: 'Talent Pool' },
    { value: 'no_response', label: 'No responde' },
    { value: 'rejected_offer', label: 'Rechazó oferta' }
  ];

  const EXPERIENCE_RANGE_OPTIONS = [
    { value: '0-2', label: '0-2 años' },
    { value: '3-5', label: '3-5 años' },
    { value: '5-10', label: '5-10 años' },
    { value: '+10', label: '+10 años' }
  ];

  const loadCandidate = React.useCallback(async () => {
    try {
      const data = await apiRequest(`/candidates/${id}`);
      setCandidate(data);
    } catch (error) {
      console.error('Error loading candidate:', error);
      toast.error('Error al cargar candidato');
      navigate('/candidates');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadVacancies = async () => {
    try {
      const data = await apiRequest('/vacancies?status=published&limit=100');
      setVacancies(data.items || []);
    } catch (error) {
      console.error('Error loading vacancies:', error);
    }
  };

  const loadHRPersonnel = async () => {
    try {
      const data = await apiRequest('/hr-personnel?active_only=true');
      setHrPersonnel(data || []);
    } catch (error) {
      console.error('Error loading HR personnel:', error);
    }
  };

  const loadCatalogs = async () => {
    try {
      const [levels, areas, langs] = await Promise.all([
        apiRequest('/catalogs/professional-levels'),
        apiRequest('/catalogs/professional-areas'),
        apiRequest('/catalogs/languages')
      ]);
      setProfessionalLevels(levels || []);
      setProfessionalAreas(areas || []);
      setLanguages(langs || []);
    } catch (error) {
      console.error('Error loading catalogs:', error);
    }
  };

  const loadInterviewHistory = async () => {
    setLoadingInterviews(true);
    try {
      const data = await apiRequest(`/candidates/${id}/interviews`);
      setInterviewHistory(data || []);
    } catch (error) {
      console.error('Error loading interview history:', error);
    } finally {
      setLoadingInterviews(false);
    }
  };

  useEffect(() => {
    loadCandidate();
    loadInterviewHistory();
  }, [loadCandidate]);

  // Experience handlers
  const handleEditExperience = (exp) => {
    setEditingExp(exp);
    setExpFormData({
      company: exp.company,
      position: exp.position,
      start_date: exp.start_date || '',
      end_date: exp.end_date || '',
      is_current: exp.is_current || false,
      description: exp.description || ''
    });
    setShowExpDialog(true);
  };

  const handleSaveExperience = async () => {
    try {
      if (editingExp?.id) {
        await apiRequest(`/candidates/${id}/experience/${editingExp.id}`, {
          method: 'PUT',
          body: JSON.stringify(expFormData)
        });
        toast.success('Experiencia actualizada');
      } else {
        await apiRequest(`/candidates/${id}/experience`, {
          method: 'POST',
          body: JSON.stringify(expFormData)
        });
        toast.success('Experiencia agregada');
      }
      setShowExpDialog(false);
      setEditingExp(null);
      loadCandidate();
    } catch (error) {
      toast.error(error.message || 'Error al guardar experiencia');
    }
  };

  const handleDeleteExperience = async (expId) => {
    if (!expId || !window.confirm('¿Eliminar esta experiencia?')) return;
    try {
      await apiRequest(`/candidates/${id}/experience/${expId}`, { method: 'DELETE' });
      toast.success('Experiencia eliminada');
      loadCandidate();
    } catch (error) {
      toast.error('Error al eliminar experiencia');
    }
  };

  // Education handlers
  const handleEditEducation = (edu) => {
    setEditingEdu(edu);
    setEduFormData({
      institution: edu.institution,
      degree: edu.degree,
      field_of_study: edu.field_of_study || '',
      start_date: edu.start_date || '',
      end_date: edu.end_date || ''
    });
    setShowEduDialog(true);
  };

  const handleSaveEducation = async () => {
    try {
      if (editingEdu?.id) {
        await apiRequest(`/candidates/${id}/education/${editingEdu.id}`, {
          method: 'PUT',
          body: JSON.stringify(eduFormData)
        });
        toast.success('Educación actualizada');
      } else {
        await apiRequest(`/candidates/${id}/education`, {
          method: 'POST',
          body: JSON.stringify(eduFormData)
        });
        toast.success('Educación agregada');
      }
      setShowEduDialog(false);
      setEditingEdu(null);
      loadCandidate();
    } catch (error) {
      toast.error(error.message || 'Error al guardar educación');
    }
  };

  const handleDeleteEducation = async (eduId) => {
    if (!eduId || !window.confirm('¿Eliminar esta educación?')) return;
    try {
      await apiRequest(`/candidates/${id}/education/${eduId}`, { method: 'DELETE' });
      toast.success('Educación eliminada');
      loadCandidate();
    } catch (error) {
      toast.error('Error al eliminar educación');
    }
  };

  // Link to vacancy handler
  const handleLinkVacancy = async () => {
    if (!selectedVacancy) {
      toast.error('Selecciona una vacante');
      return;
    }
    try {
      await apiRequest(`/candidates/${id}/link-vacancy/${selectedVacancy}`, { method: 'POST' });
      toast.success('Candidato vinculado a la vacante');
      setShowLinkVacancyDialog(false);
      setSelectedVacancy('');
      loadCandidate();
    } catch (error) {
      toast.error(error.message || 'Error al vincular candidato');
    }
  };

  // Create Interview handler
  const handleCreateInterview = async () => {
    if (!interviewForm.application_id || !interviewForm.scheduled_date || !interviewForm.interviewer_id) {
      toast.error('Completa los campos requeridos');
      return;
    }
    try {
      const scheduledAt = new Date(`${interviewForm.scheduled_date}T${interviewForm.scheduled_time}:00`);
      const payload = {
        application_id: interviewForm.application_id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: interviewForm.duration_minutes,
        interview_type: interviewForm.interview_type,
        interviewer_id: interviewForm.interviewer_id,
        location: interviewForm.location || '',
        meeting_link: interviewForm.meeting_link || '',
        notes: interviewForm.notes || ''
      };
      await apiRequest('/interviews', { method: 'POST', body: JSON.stringify(payload) });
      toast.success('Entrevista creada');
      setShowInterviewDialog(false);
      setInterviewForm({
        application_id: '',
        scheduled_date: '',
        scheduled_time: '10:00',
        duration_minutes: 60,
        interview_type: 'hr',
        interviewer_id: '',
        location: '',
        meeting_link: '',
        notes: ''
      });
    } catch (error) {
      toast.error(error.message || 'Error al crear entrevista');
    }
  };

  const handleEdit = () => {
    // Extract IDs from relational data
    const areaIds = candidate.professional_areas?.map(a => a.area_id) || [];
    const langIds = candidate.languages?.map(l => l.language_id) || [];
    
    setEditFormData({
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone || '',
      linkedin_url: candidate.linkedin_url || '',
      portfolio_url: candidate.portfolio_url || '',
      location: candidate.location || '',
      expected_salary: candidate.expected_salary || '',
      salary_currency: candidate.salary_currency || 'GTQ',
      skills: candidate.skills?.join(', ') || '',
      source: candidate.source || 'portal',
      notes: candidate.notes || '',
      // Classification fields
      candidate_status: candidate.candidate_status || 'available',
      disqualification_reason: candidate.disqualification_reason || '',
      experience_range: candidate.experience_range || '',
      professional_level_id: candidate.professional_level_id || '',
      professional_area_ids: areaIds,
      language_ids: langIds
    });
    loadCatalogs();
    setShowEditForm(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editFormData,
        expected_salary: editFormData.expected_salary ? parseFloat(editFormData.expected_salary) : null,
        skills: editFormData.skills.split(',').map(s => s.trim()).filter(Boolean),
        education: candidate.education || [],
        experience: candidate.experience || [],
        // Classification fields (without arrays - those are synced separately)
        candidate_status: editFormData.candidate_status,
        disqualification_reason: editFormData.candidate_status === 'disqualified' ? editFormData.disqualification_reason : '',
        experience_range: editFormData.experience_range || null,
        professional_level_id: editFormData.professional_level_id || null
      };
      
      // Update candidate basic data
      await apiRequest(`/candidates/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      
      // Sync areas (relational table)
      if (editFormData.professional_area_ids) {
        await apiRequest(`/candidates/${id}/areas/sync`, { 
          method: 'PUT', 
          body: JSON.stringify(editFormData.professional_area_ids)
        });
      }
      
      // Sync languages (relational table)
      if (editFormData.language_ids) {
        await apiRequest(`/candidates/${id}/languages/sync`, { 
          method: 'PUT', 
          body: JSON.stringify(editFormData.language_ids)
        });
      }
      
      toast.success('Candidato actualizado');
      setShowEditForm(false);
      loadCandidate();
    } catch (error) {
      toast.error(error.message || 'Error al actualizar');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`${API_URL}/candidates/${id}/upload?file_type=cv`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Error al subir archivo' }));
        throw new Error(err.detail);
      }
      toast.success('Archivo subido exitosamente');
      loadCandidate();
    } catch (error) {
      toast.error(error.message || 'Error al subir archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    try {
      await apiRequest(`/candidates/${id}/files/${fileId}`, { method: 'DELETE' });
      toast.success('Archivo eliminado');
      loadCandidate();
    } catch (error) {
      toast.error('Error al eliminar archivo');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!candidate) return null;

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="space-y-6" data-testid="candidate-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/candidates')} data-testid="back-button">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {candidate.first_name} {candidate.last_name}
          </h1>
          <p className="text-slate-500">Perfil del Candidato</p>
        </div>
        <Button variant="outline" onClick={handleEdit} data-testid="edit-candidate-btn">
          <Edit size={16} className="mr-2" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarFallback className="bg-slate-100 text-slate-600 text-2xl">
                  {getInitials(candidate.first_name, candidate.last_name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold text-slate-900">
                {candidate.first_name} {candidate.last_name}
              </h2>
              <Badge variant="outline" className="mt-2">
                {SOURCE_OPTIONS.find(s => s.value === candidate.source)?.label || candidate.source}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-slate-400" />
                <span className="text-slate-600">{candidate.email}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-slate-400" />
                  <span className="text-slate-600">{candidate.phone}</span>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin size={16} className="text-slate-400" />
                  <span className="text-slate-600">{candidate.location}</span>
                </div>
              )}
              {candidate.expected_salary && (
                <div className="flex items-center gap-3 text-sm">
                  <DollarSign size={16} className="text-emerald-500" />
                  <span className="text-slate-600">{candidate.salary_currency || 'GTQ'} {formatCurrency(candidate.expected_salary)}</span>
                </div>
              )}
              {candidate.linkedin_url && (
                <div className="flex items-center gap-3 text-sm">
                  <LinkIcon size={16} className="text-blue-500" />
                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    LinkedIn
                  </a>
                </div>
              )}
              {candidate.portfolio_url && (
                <div className="flex items-center gap-3 text-sm">
                  <LinkIcon size={16} className="text-purple-500" />
                  <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                    Portafolio
                  </a>
                </div>
              )}
            </div>

            {candidate.skills?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-900 mb-3">Habilidades</h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Candidate Classification */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-medium text-slate-900 mb-3">Clasificación</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Estatus:</span>
                  <Badge className={
                    candidate.candidate_status === 'available' ? 'bg-green-50 text-green-700' :
                    candidate.candidate_status === 'disqualified' ? 'bg-red-50 text-red-700' :
                    candidate.candidate_status === 'talent_pool' ? 'bg-blue-50 text-blue-700' :
                    candidate.candidate_status === 'no_response' ? 'bg-amber-50 text-amber-700' :
                    candidate.candidate_status === 'rejected_offer' ? 'bg-purple-50 text-purple-700' :
                    'bg-slate-100 text-slate-600'
                  }>
                    {CANDIDATE_STATUS_OPTIONS.find(s => s.value === candidate.candidate_status)?.label || 'Disponible'}
                  </Badge>
                </div>
                {candidate.experience_range && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Experiencia:</span>
                    <span className="text-slate-700">{candidate.experience_range} años</span>
                  </div>
                )}
                {candidate.professional_level_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Nivel:</span>
                    <span className="text-slate-700">{candidate.professional_level_name}</span>
                  </div>
                )}
                {candidate.disqualification_reason && candidate.candidate_status === 'disqualified' && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                    <strong>Motivo:</strong> {candidate.disqualification_reason}
                  </div>
                )}
              </div>
              
              {/* Professional Areas */}
              {candidate.professional_areas?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2">Áreas Profesionales:</p>
                  <div className="flex flex-wrap gap-1">
                    {candidate.professional_areas.map((area, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{area.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Languages */}
              {candidate.languages?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2">Idiomas:</p>
                  <div className="flex flex-wrap gap-1">
                    {candidate.languages.map((lang, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {lang.name} {lang.level ? `(${lang.level})` : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="applications">
            <TabsList>
              <TabsTrigger value="applications">Aplicaciones</TabsTrigger>
              <TabsTrigger value="interviews">Entrevistas</TabsTrigger>
              <TabsTrigger value="experience">Experiencia</TabsTrigger>
              <TabsTrigger value="education">Educación</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
            </TabsList>

            <TabsContent value="applications" className="mt-4">
              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Historial de Aplicaciones</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { loadVacancies(); loadHRPersonnel(); setShowInterviewDialog(true); }}
                      disabled={!candidate.applications?.length}
                      data-testid="create-interview-btn"
                    >
                      <Calendar size={14} className="mr-1.5" />
                      Crear Entrevista
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { loadVacancies(); setShowLinkVacancyDialog(true); }}
                      data-testid="link-vacancy-btn"
                    >
                      <Plus size={14} className="mr-1.5" />
                      Vincular a Vacante
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {candidate.applications?.length > 0 ? (
                    <div className="space-y-3">
                      {candidate.applications.map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          onClick={() => navigate(`/pipeline?vacancy=${app.vacancy_id}`)}
                          data-testid={`app-history-${app.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Briefcase size={18} className="text-slate-400" />
                            <div>
                              <p className="font-medium text-slate-900">
                                {app.vacancy_title || app.vacancy?.title || `Vacante #${app.vacancy_id?.slice(0, 8)}`}
                              </p>
                              {app.vacancy_location && (
                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                  <MapPin size={10} />
                                  {app.vacancy_location}
                                </div>
                              )}
                              <p className="text-xs text-slate-500 mt-0.5">{formatDate(app.created_at)}</p>
                            </div>
                          </div>
                          <Badge className={PIPELINE_STAGES[app.current_stage]?.color}>
                            {PIPELINE_STAGES[app.current_stage]?.label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">Sin aplicaciones</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interviews" className="mt-4">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Historial de Entrevistas</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingInterviews ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : interviewHistory.length > 0 ? (
                    <div className="space-y-3">
                      {interviewHistory.map((interview) => (
                        <div
                          key={interview.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          onClick={() => navigate(`/interviews?id=${interview.id}`)}
                          data-testid={`interview-history-${interview.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Calendar size={18} className="text-slate-400" />
                            <div>
                              <p className="font-medium text-slate-900">
                                {interview.interview_type === 'hr' ? 'Entrevista RRHH' :
                                 interview.interview_type === 'technical' ? 'Entrevista Técnica' :
                                 interview.interview_type === 'cultural' ? 'Entrevista Cultural' :
                                 interview.interview_type === 'final' ? 'Entrevista Final' :
                                 interview.interview_type === 'exam' ? 'Examen' :
                                 interview.interview_type}
                              </p>
                              <p className="text-sm text-slate-600">{interview.vacancy_title}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                <span>{formatDate(interview.scheduled_at)}</span>
                                {interview.interviewer_name && (
                                  <span>• {interview.interviewer_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={
                              interview.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                              interview.status === 'completed' ? 'bg-green-50 text-green-700' :
                              interview.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                              'bg-slate-100 text-slate-600'
                            }>
                              {interview.status === 'scheduled' ? 'Programada' :
                               interview.status === 'completed' ? 'Completada' :
                               interview.status === 'cancelled' ? 'Cancelada' :
                               interview.status}
                            </Badge>
                            {interview.notes && (
                              <p className="text-xs text-slate-400 mt-1 max-w-[200px] truncate" title={interview.notes}>
                                {interview.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">Sin entrevistas registradas</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="experience" className="mt-4">
              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Experiencia Laboral</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingExp(null); setExpFormData({ company: '', position: '', start_date: '', end_date: '', is_current: false, description: '' }); setShowExpDialog(true); }}
                    data-testid="add-experience-btn"
                  >
                    <Plus size={14} className="mr-1.5" />
                    Agregar
                  </Button>
                </CardHeader>
                <CardContent>
                  {candidate.experience?.length > 0 ? (
                    <div className="space-y-4">
                      {candidate.experience.map((exp, i) => (
                        <div key={exp.id || i} className="border-l-2 border-cyan-500 pl-4 py-2 group relative">
                          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditExperience(exp)} data-testid={`edit-exp-${exp.id || i}`}>
                              <Edit size={12} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteExperience(exp.id)} data-testid={`delete-exp-${exp.id || i}`}>
                              <Trash2 size={12} />
                            </Button>
                          </div>
                          <h4 className="font-medium text-slate-900">{exp.position}</h4>
                          <p className="text-sm text-slate-600">{exp.company}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {exp.start_date} - {exp.is_current ? 'Presente' : exp.end_date}
                          </p>
                          {exp.description && (
                            <p className="text-sm text-slate-500 mt-2">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">Sin experiencia registrada</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="education" className="mt-4">
              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Educación</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingEdu(null); setEduFormData({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' }); setShowEduDialog(true); }}
                    data-testid="add-education-btn"
                  >
                    <Plus size={14} className="mr-1.5" />
                    Agregar
                  </Button>
                </CardHeader>
                <CardContent>
                  {candidate.education?.length > 0 ? (
                    <div className="space-y-4">
                      {candidate.education.map((edu, i) => (
                        <div key={edu.id || i} className="border-l-2 border-purple-500 pl-4 py-2 group relative">
                          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEducation(edu)} data-testid={`edit-edu-${edu.id || i}`}>
                              <Edit size={12} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteEducation(edu.id)} data-testid={`delete-edu-${edu.id || i}`}>
                              <Trash2 size={12} />
                            </Button>
                          </div>
                          <h4 className="font-medium text-slate-900">{edu.degree}</h4>
                          <p className="text-sm text-slate-600">{edu.institution}</p>
                          <p className="text-xs text-slate-500">{edu.field_of_study}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {edu.start_date} - {edu.end_date || 'Presente'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">Sin educación registrada</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.notes ? (
                    <p className="text-slate-600 whitespace-pre-wrap">{candidate.notes}</p>
                  ) : (
                    <p className="text-slate-400 text-center py-8">Sin notas</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Documentos y CV</CardTitle>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleFileUpload}
                      data-testid="file-input"
                    />
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="bg-slate-900 hover:bg-slate-800"
                      data-testid="upload-file-btn"
                    >
                      <Upload size={14} className="mr-2" />
                      {uploading ? 'Subiendo...' : 'Subir Archivo'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {candidate.documents?.length > 0 ? (
                    <div className="space-y-3">
                      {candidate.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200"
                          data-testid={`doc-item-${doc.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText size={18} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{doc.filename}</p>
                              <p className="text-xs text-slate-400">
                                {formatFileSize(doc.file_size)} · {formatDate(doc.uploaded_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`${API_URL}/candidates/${id}/files/${doc.id}`}
                              download={doc.filename}
                              className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-slate-200 text-slate-600"
                              data-testid={`download-doc-${doc.id}`}
                              onClick={async (e) => {
                                e.preventDefault();
                                const token = getToken();
                                const res = await fetch(`${API_URL}/candidates/${id}/files/${doc.id}`, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = doc.filename;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              <Download size={14} />
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteFile(doc.id)}
                              data-testid={`delete-doc-${doc.id}`}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-400">
                      <PaperclipIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Sin documentos adjuntos</p>
                      <p className="text-xs mt-1">Sube CV, cartas de presentación u otros archivos</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Candidato</DialogTitle>
          </DialogHeader>
          {editFormData && (
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    required
                    data-testid="edit-firstname-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellido *</Label>
                  <Input
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    required
                    data-testid="edit-lastname-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    required
                    data-testid="edit-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    data-testid="edit-phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ubicación</Label>
                  <Input
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    data-testid="edit-location-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expectativa Salarial</Label>
                  <div className="flex gap-2">
                    <Select value={editFormData.salary_currency || 'GTQ'} onValueChange={(v) => setEditFormData({ ...editFormData, salary_currency: v })}>
                      <SelectTrigger className="w-24" data-testid="edit-currency-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GTQ">GTQ</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      className="flex-1"
                      value={editFormData.expected_salary}
                      onChange={(e) => setEditFormData({ ...editFormData, expected_salary: e.target.value })}
                      data-testid="edit-salary-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input
                    value={editFormData.linkedin_url}
                    onChange={(e) => setEditFormData({ ...editFormData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    data-testid="edit-linkedin-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Portafolio</Label>
                  <Input
                    value={editFormData.portfolio_url}
                    onChange={(e) => setEditFormData({ ...editFormData, portfolio_url: e.target.value })}
                    placeholder="https://..."
                    data-testid="edit-portfolio-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fuente</Label>
                  <Select value={editFormData.source} onValueChange={(v) => setEditFormData({ ...editFormData, source: v })}>
                    <SelectTrigger data-testid="edit-source-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Habilidades</Label>
                  <Input
                    value={editFormData.skills}
                    onChange={(e) => setEditFormData({ ...editFormData, skills: e.target.value })}
                    placeholder="React, Node.js, Python..."
                    data-testid="edit-skills-input"
                  />
                </div>
              </div>

              {/* NEW FIELDS SECTION */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">Clasificación del Candidato</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estatus del Candidato</Label>
                    <Select 
                      value={editFormData.candidate_status} 
                      onValueChange={(v) => setEditFormData({ ...editFormData, candidate_status: v, disqualification_reason: v !== 'disqualified' ? '' : editFormData.disqualification_reason })}
                    >
                      <SelectTrigger data-testid="edit-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CANDIDATE_STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rango de Experiencia</Label>
                    <Select 
                      value={editFormData.experience_range || 'none'} 
                      onValueChange={(v) => setEditFormData({ ...editFormData, experience_range: v === 'none' ? '' : v })}
                    >
                      <SelectTrigger data-testid="edit-experience-range-select">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin especificar</SelectItem>
                        {EXPERIENCE_RANGE_OPTIONS.map(e => (
                          <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editFormData.candidate_status === 'disqualified' && (
                    <div className="col-span-2 space-y-2">
                      <Label>Motivo de Descalificación *</Label>
                      <Textarea
                        value={editFormData.disqualification_reason}
                        onChange={(e) => setEditFormData({ ...editFormData, disqualification_reason: e.target.value })}
                        placeholder="Explique el motivo de descalificación..."
                        rows={2}
                        data-testid="edit-disqualification-reason"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Nivel Profesional</Label>
                    <Select 
                      value={editFormData.professional_level_id || 'none'} 
                      onValueChange={(v) => setEditFormData({ ...editFormData, professional_level_id: v === 'none' ? '' : v })}
                    >
                      <SelectTrigger data-testid="edit-level-select">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin especificar</SelectItem>
                        {professionalLevels.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Áreas Profesionales</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] max-h-[100px] overflow-y-auto">
                      {professionalAreas.map(a => (
                        <label key={a.id} className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200">
                          <input
                            type="checkbox"
                            checked={editFormData.professional_area_ids?.includes(a.id)}
                            onChange={(e) => {
                              const ids = editFormData.professional_area_ids || [];
                              if (e.target.checked) {
                                setEditFormData({ ...editFormData, professional_area_ids: [...ids, a.id] });
                              } else {
                                setEditFormData({ ...editFormData, professional_area_ids: ids.filter(id => id !== a.id) });
                              }
                            }}
                            className="w-3 h-3"
                          />
                          {a.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Idiomas</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] max-h-[100px] overflow-y-auto">
                      {languages.map(l => (
                        <label key={l.id} className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200">
                          <input
                            type="checkbox"
                            checked={editFormData.language_ids?.includes(l.id)}
                            onChange={(e) => {
                              const ids = editFormData.language_ids || [];
                              if (e.target.checked) {
                                setEditFormData({ ...editFormData, language_ids: [...ids, l.id] });
                              } else {
                                setEditFormData({ ...editFormData, language_ids: ids.filter(id => id !== l.id) });
                              }
                            }}
                            className="w-3 h-3"
                          />
                          {l.name} {l.level ? `(${l.level})` : ''}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows={3}
                  data-testid="edit-notes-input"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="edit-submit-btn">
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Experience Dialog */}
      <Dialog open={showExpDialog} onOpenChange={setShowExpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExp ? 'Editar Experiencia' : 'Agregar Experiencia'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Input
                value={expFormData.company}
                onChange={(e) => setExpFormData({ ...expFormData, company: e.target.value })}
                placeholder="Nombre de la empresa"
                data-testid="exp-company-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <Input
                value={expFormData.position}
                onChange={(e) => setExpFormData({ ...expFormData, position: e.target.value })}
                placeholder="Puesto ocupado"
                data-testid="exp-position-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="month"
                  value={expFormData.start_date}
                  onChange={(e) => setExpFormData({ ...expFormData, start_date: e.target.value })}
                  data-testid="exp-start-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="month"
                  value={expFormData.end_date}
                  onChange={(e) => setExpFormData({ ...expFormData, end_date: e.target.value })}
                  disabled={expFormData.is_current}
                  data-testid="exp-end-input"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={expFormData.is_current}
                onChange={(e) => setExpFormData({ ...expFormData, is_current: e.target.checked, end_date: '' })}
                className="rounded"
                data-testid="exp-current-checkbox"
              />
              <Label className="text-sm">Trabajo actual</Label>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={expFormData.description}
                onChange={(e) => setExpFormData({ ...expFormData, description: e.target.value })}
                rows={3}
                placeholder="Responsabilidades y logros..."
                data-testid="exp-description-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowExpDialog(false)}>Cancelar</Button>
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800"
              onClick={handleSaveExperience}
              disabled={!expFormData.company || !expFormData.position}
              data-testid="exp-save-btn"
            >
              {editingExp ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Education Dialog */}
      <Dialog open={showEduDialog} onOpenChange={setShowEduDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEdu ? 'Editar Educación' : 'Agregar Educación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Institución *</Label>
              <Input
                value={eduFormData.institution}
                onChange={(e) => setEduFormData({ ...eduFormData, institution: e.target.value })}
                placeholder="Universidad o institución"
                data-testid="edu-institution-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Grado / Título *</Label>
              <Input
                value={eduFormData.degree}
                onChange={(e) => setEduFormData({ ...eduFormData, degree: e.target.value })}
                placeholder="Ej: Licenciatura, Maestría..."
                data-testid="edu-degree-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Campo de Estudio</Label>
              <Input
                value={eduFormData.field_of_study}
                onChange={(e) => setEduFormData({ ...eduFormData, field_of_study: e.target.value })}
                placeholder="Ej: Ingeniería en Sistemas"
                data-testid="edu-field-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="month"
                  value={eduFormData.start_date}
                  onChange={(e) => setEduFormData({ ...eduFormData, start_date: e.target.value })}
                  data-testid="edu-start-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="month"
                  value={eduFormData.end_date}
                  onChange={(e) => setEduFormData({ ...eduFormData, end_date: e.target.value })}
                  data-testid="edu-end-input"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEduDialog(false)}>Cancelar</Button>
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800"
              onClick={handleSaveEducation}
              disabled={!eduFormData.institution || !eduFormData.degree}
              data-testid="edu-save-btn"
            >
              {editingEdu ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link to Vacancy Dialog */}
      <Dialog open={showLinkVacancyDialog} onOpenChange={(open) => { setShowLinkVacancyDialog(open); if (open) loadVacancies(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular a Vacante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Selecciona una vacante publicada para vincular a <strong>{candidate?.first_name} {candidate?.last_name}</strong>
            </p>
            <div className="space-y-2">
              <Label>Vacante *</Label>
              <Select value={selectedVacancy} onValueChange={setSelectedVacancy}>
                <SelectTrigger data-testid="link-vacancy-select">
                  <SelectValue placeholder="Selecciona una vacante..." />
                </SelectTrigger>
                <SelectContent>
                  {vacancies.length === 0 ? (
                    <SelectItem value="none" disabled>No hay vacantes publicadas</SelectItem>
                  ) : (
                    vacancies.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.title} - {v.location || 'Sin ubicación'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowLinkVacancyDialog(false)}>Cancelar</Button>
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800"
              onClick={handleLinkVacancy}
              disabled={!selectedVacancy}
              data-testid="link-vacancy-confirm-btn"
            >
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Interview Dialog */}
      <Dialog open={showInterviewDialog} onOpenChange={setShowInterviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Entrevista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Aplicación *</Label>
              <Select value={interviewForm.application_id} onValueChange={(v) => setInterviewForm({ ...interviewForm, application_id: v })}>
                <SelectTrigger data-testid="interview-application-select">
                  <SelectValue placeholder="Selecciona una aplicación..." />
                </SelectTrigger>
                <SelectContent>
                  {candidate?.applications?.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.vacancy_title || app.vacancy?.title || `Vacante #${app.vacancy_id?.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={interviewForm.scheduled_date}
                  onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_date: e.target.value })}
                  data-testid="interview-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <Input
                  type="time"
                  value={interviewForm.scheduled_time}
                  onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_time: e.target.value })}
                  data-testid="interview-time-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={interviewForm.interview_type} onValueChange={(v) => setInterviewForm({ ...interviewForm, interview_type: v })}>
                  <SelectTrigger data-testid="interview-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hr">Entrevista RH</SelectItem>
                    <SelectItem value="technical">Técnica</SelectItem>
                    <SelectItem value="cultural">Fit Cultural</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="exam">Examen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duración</Label>
                <Select value={String(interviewForm.duration_minutes)} onValueChange={(v) => setInterviewForm({ ...interviewForm, duration_minutes: parseInt(v) })}>
                  <SelectTrigger data-testid="interview-duration-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Entrevistador *</Label>
              <Select value={interviewForm.interviewer_id} onValueChange={(v) => setInterviewForm({ ...interviewForm, interviewer_id: v })}>
                <SelectTrigger data-testid="interview-interviewer-select">
                  <SelectValue placeholder="Selecciona entrevistador..." />
                </SelectTrigger>
                <SelectContent>
                  {hrPersonnel.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} {p.position ? `— ${p.position}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hrPersonnel.length === 0 && (
                <p className="text-xs text-amber-600">No hay entrevistadores. Agrégalos en Personal RRHH.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input
                value={interviewForm.location}
                onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })}
                placeholder="Ej: Sala de juntas 1"
                data-testid="interview-location-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Enlace de Videoconferencia</Label>
              <Input
                value={interviewForm.meeting_link}
                onChange={(e) => setInterviewForm({ ...interviewForm, meeting_link: e.target.value })}
                placeholder="https://meet.google.com/..."
                data-testid="interview-link-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={interviewForm.notes}
                onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                rows={2}
                placeholder="Notas adicionales..."
                data-testid="interview-notes-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowInterviewDialog(false)}>Cancelar</Button>
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800"
              onClick={handleCreateInterview}
              disabled={!interviewForm.application_id || !interviewForm.scheduled_date || !interviewForm.interviewer_id}
              data-testid="interview-create-btn"
            >
              Crear Entrevista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
