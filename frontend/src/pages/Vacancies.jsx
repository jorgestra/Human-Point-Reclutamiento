import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, VACANCY_STATUS, formatCurrency, formatDate, JOB_TYPES } from '../lib/utils';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Filter,
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  Eye,
  Edit,
  Globe,
  Building,
  Send,
  XCircle,
  Copy,
  ExternalLink,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export const Vacancies = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vacancies, setVacancies] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState(null);

  const initialFormState = {
    requisition_id: searchParams.get('requisition') || '',
    title: '',
    description: '',
    requirements: '',
    benefits: '',
    location: '',
    job_type: 'full_time',
    salary_min: '',
    salary_max: '',
    is_internal: false,
    is_external: true,
    deadline: '',
    empresa_id: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    loadVacancies();
    loadRequisitions();
    apiRequest('/companies').then(setCompanies).catch(() => {});
  }, [statusFilter]);

  useEffect(() => {
    if (searchParams.get('requisition')) {
      loadRequisitionData(searchParams.get('requisition'));
      setShowForm(true);
    }
  }, [searchParams]);

  const loadVacancies = async () => {
    try {
      const endpoint = statusFilter !== 'all' 
        ? `/vacancies?status=${statusFilter}` 
        : '/vacancies';
      const data = await apiRequest(endpoint);
      setVacancies(data.items || []);
    } catch (error) {
      console.error('Error loading vacancies:', error);
      toast.error('Error al cargar vacantes');
    } finally {
      setLoading(false);
    }
  };

  const loadRequisitions = async () => {
    try {
      const data = await apiRequest('/requisitions?status=approved&limit=100');
      setRequisitions(data.items?.filter(r => !r.vacancy_id) || []);
    } catch (error) {
      console.error('Error loading requisitions:', error);
    }
  };

  const loadRequisitionData = async (reqId) => {
    try {
      const req = await apiRequest(`/requisitions/${reqId}`);
      setFormData(prev => ({
        ...prev,
        requisition_id: reqId,
        title: req.title,
        description: req.justification || req.requirements || `Vacante para el puesto de ${req.title}`,
        requirements: req.requirements || '',
        benefits: req.benefits || '',
        location: req.location || '',
        job_type: req.job_type,
        salary_min: req.salary_min,
        salary_max: req.salary_max,
        empresa_id: req.empresa_id || ''  // Inherit empresa_id from requisition
      }));
    } catch (error) {
      console.error('Error loading requisition:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        salary_min: parseFloat(formData.salary_min),
        salary_max: parseFloat(formData.salary_max),
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null
      };

      if (editingVacancy) {
        await apiRequest(`/vacancies/${editingVacancy.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Vacante actualizada');
      } else {
        await apiRequest('/vacancies', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Vacante creada');
      }
      
      setShowForm(false);
      setEditingVacancy(null);
      setFormData(initialFormState);
      loadVacancies();
      loadRequisitions();
    } catch (error) {
      toast.error(error.message || 'Error al guardar vacante');
    }
  };

  const handleEdit = (vacancy) => {
    setEditingVacancy(vacancy);
    setFormData({
      requisition_id: vacancy.requisition_id,
      title: vacancy.title,
      description: vacancy.description,
      requirements: vacancy.requirements,
      benefits: vacancy.benefits || '',
      location: vacancy.location,
      job_type: vacancy.job_type,
      salary_min: vacancy.salary_min,
      salary_max: vacancy.salary_max,
      is_internal: vacancy.is_internal,
      is_external: vacancy.is_external,
      deadline: vacancy.deadline ? vacancy.deadline.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handlePublish = async (id) => {
    try {
      await apiRequest(`/vacancies/${id}/publish`, { method: 'POST' });
      toast.success('Vacante publicada');
      loadVacancies();
    } catch (error) {
      toast.error('Error al publicar');
    }
  };

  const handleClose = async (id) => {
    try {
      await apiRequest(`/vacancies/${id}/close`, { method: 'POST' });
      toast.success('Vacante cerrada');
      loadVacancies();
    } catch (error) {
      toast.error('Error al cerrar');
    }
  };

  const copyLink = (vacancyId) => {
    const url = `${window.location.origin}/jobs/${vacancyId}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado');
  };

  const filteredVacancies = vacancies.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="vacancies-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Vacantes</h1>
          <p className="text-slate-500 mt-1">Gestiona las posiciones abiertas</p>
        </div>
        <Button 
          onClick={() => { setFormData(initialFormState); setEditingVacancy(null); setShowForm(true); }}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="new-vacancy-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Vacante
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por título o ubicación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="status-filter">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="published">Publicadas</SelectItem>
                <SelectItem value="closed">Cerradas</SelectItem>
                <SelectItem value="on_hold">En Pausa</SelectItem>
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
                <TableHead>Vacante</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Salario</TableHead>
                <TableHead>Aplicaciones</TableHead>
                <TableHead>Publicación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredVacancies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                    No hay vacantes
                  </TableCell>
                </TableRow>
              ) : (
                filteredVacancies.map((vacancy) => {
                  const status = VACANCY_STATUS[vacancy.status];
                  return (
                    <TableRow key={vacancy.id} className="hover:bg-slate-50" data-testid={`vacancy-row-${vacancy.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
                            <Briefcase size={18} className="text-cyan-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{vacancy.title}</p>
                            <p className="text-xs text-slate-500">{vacancy.job_type === 'full_time' ? 'Tiempo Completo' : vacancy.job_type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{vacancy.empresa_name || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-slate-400" />
                          {vacancy.location || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-emerald-500" />
                          <span className="text-sm">{formatCurrency(vacancy.salary_min)} - {formatCurrency(vacancy.salary_max)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-slate-400" />
                          <span>{vacancy.applications_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {vacancy.is_external && <Globe size={14} className="text-blue-500" title="Externa" />}
                          {vacancy.is_internal && <Building size={14} className="text-purple-500" title="Interna" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={status?.color}>{status?.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`vacancy-menu-${vacancy.id}`}>
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/pipeline?vacancy=${vacancy.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Pipeline
                            </DropdownMenuItem>
                            {vacancy.status === 'draft' && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(vacancy)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePublish(vacancy.id)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Publicar
                                </DropdownMenuItem>
                              </>
                            )}
                            {vacancy.status === 'published' && (
                              <>
                                <DropdownMenuItem onClick={() => copyLink(vacancy.id)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copiar Enlace
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(`/jobs/${vacancy.id}`, '_blank')}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Ver Portal
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleClose(vacancy.id)}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cerrar Vacante
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVacancy ? 'Editar Vacante' : 'Nueva Vacante'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingVacancy && (
              <div className="space-y-2">
                <Label>Requisición Aprobada *</Label>
                <Select
                  value={formData.requisition_id}
                  onValueChange={(v) => {
                    setFormData({ ...formData, requisition_id: v });
                    loadRequisitionData(v);
                  }}
                >
                  <SelectTrigger data-testid="vacancy-requisition-select">
                    <SelectValue placeholder="Seleccione una requisición" />
                  </SelectTrigger>
                  <SelectContent>
                    {requisitions.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title} - {r.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {companies.length > 0 && (
              <div className="space-y-2">
                <Label>Empresa {formData.requisition_id ? '(heredada de requisición)' : ''}</Label>
                <Select 
                  value={formData.empresa_id || 'none'} 
                  onValueChange={v => setFormData({ ...formData, empresa_id: v === 'none' ? '' : v })}
                  disabled={!!formData.requisition_id}
                >
                  <SelectTrigger data-testid="vacancy-empresa-select">
                    <SelectValue placeholder="Selecciona empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin empresa específica</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="vacancy-title-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Descripción *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                  data-testid="vacancy-description-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Requisitos *</Label>
                <Textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={3}
                  required
                  data-testid="vacancy-requirements-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Beneficios</Label>
                <Textarea
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  rows={2}
                  data-testid="vacancy-benefits-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Ubicación *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  data-testid="vacancy-location-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.job_type} onValueChange={(v) => setFormData({ ...formData, job_type: v })}>
                  <SelectTrigger data-testid="vacancy-jobtype-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Salario Mínimo *</Label>
                <Input
                  type="number"
                  value={formData.salary_min}
                  onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                  required
                  data-testid="vacancy-salarymin-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Salario Máximo *</Label>
                <Input
                  type="number"
                  value={formData.salary_max}
                  onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                  required
                  data-testid="vacancy-salarymax-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Límite</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  data-testid="vacancy-deadline-input"
                />
              </div>
              <div className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                  <Label>Publicar Externamente</Label>
                  <Switch
                    checked={formData.is_external}
                    onCheckedChange={(v) => setFormData({ ...formData, is_external: v })}
                    data-testid="vacancy-external-switch"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Publicar Internamente</Label>
                  <Switch
                    checked={formData.is_internal}
                    onCheckedChange={(v) => setFormData({ ...formData, is_internal: v })}
                    data-testid="vacancy-internal-switch"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="vacancy-submit-btn">
                {editingVacancy ? 'Actualizar' : 'Crear Vacante'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
