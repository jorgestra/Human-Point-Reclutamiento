import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, REQUISITION_STATUS, formatCurrency, formatDate, JOB_TYPES, CURRENCIES } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Filter,
  FileText,
  Building2,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Send,
  MoreHorizontal,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';


// Helper para header ordenable
const SortHeader = ({ label, field, sortKey, sortDir, onSort, className = "" }) => (
  <TableHead
    className={`cursor-pointer select-none hover:bg-slate-50 ${className}`}
    onClick={() => onSort(field)}
  >
    <div className="flex items-center gap-1">
      {label}
      {sortKey === field
        ? sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
        : <ChevronUp size={14} className="opacity-20" />}
    </div>
  </TableHead>
);

export const Requisitions = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [searchParams] = useSearchParams();
  const [requisitions, setRequisitions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingReq, setEditingReq] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState({ open: false, req: null, action: null });
  const [approvalComment, setApprovalComment] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    requesting_area: '',
    justification: '',
    positions_count: 1,
    salary_min: '',
    salary_max: '',
    currency: 'GTQ',
    job_type: 'full_time',
    location: '',
    requirements: '',
    benefits: '',
    empresa_id: ''
  });

  
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedItems = (items) => {
    if (!items?.length) return items || [];
    return [...items].sort((a, b) => {
      let valA = a[sortKey] ?? '';
      let valB = b[sortKey] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number')
        return sortDir === 'asc' ? valA - valB : valB - valA;
      return sortDir === 'asc'
        ? String(valA).toLowerCase().localeCompare(String(valB).toLowerCase())
        : String(valB).toLowerCase().localeCompare(String(valA).toLowerCase());
    });
  };

useEffect(() => {
    loadRequisitions();
    apiRequest('/companies').then(setCompanies).catch(() => {});
  }, [statusFilter]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      resetForm();
      setEditingReq(null);
      setShowForm(true);
    }
  }, [searchParams]);

  const loadRequisitions = async () => {
    try {
      const endpoint = statusFilter !== 'all' 
        ? `/requisitions?status=${statusFilter}` 
        : '/requisitions';
      const data = await apiRequest(endpoint);
      setRequisitions(data.items || []);
    } catch (error) {
      console.error('Error loading requisitions:', error);
      toast.error('Error al cargar requisiciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        salary_min: parseFloat(formData.salary_min),
        salary_max: parseFloat(formData.salary_max),
        positions_count: parseInt(formData.positions_count)
      };

      if (editingReq) {
        await apiRequest(`/requisitions/${editingReq.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Requisición actualizada');
      } else {
        await apiRequest('/requisitions', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Requisición creada');
      }
      
      setShowForm(false);
      setEditingReq(null);
      resetForm();
      loadRequisitions();
    } catch (error) {
      toast.error(error.message || 'Error al guardar requisición');
    }
  };

  const handleEdit = (req) => {
    setEditingReq(req);
    setFormData({
      title: req.title,
      department: req.department,
      requesting_area: req.requesting_area,
      justification: req.justification,
      positions_count: req.positions_count,
      salary_min: req.salary_min,
      salary_max: req.salary_max,
      currency: req.currency || 'GTQ',
      job_type: req.job_type,
      location: req.location || '',
      requirements: req.requirements || '',
      benefits: req.benefits || '',
      empresa_id: req.empresa_id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta requisición?')) return;
    try {
      await apiRequest(`/requisitions/${id}`, { method: 'DELETE' });
      toast.success('Requisición eliminada');
      loadRequisitions();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleSubmitForApproval = async (id) => {
    try {
      await apiRequest(`/requisitions/${id}/submit`, { method: 'POST' });
      toast.success('Requisición enviada a aprobación');
      loadRequisitions();
    } catch (error) {
      toast.error(error.message || 'Error al enviar');
    }
  };

  const handleApproval = async () => {
    if (!approvalDialog.req) return;
    try {
      await apiRequest(`/requisitions/${approvalDialog.req.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action: approvalDialog.action, comments: approvalComment })
      });
      toast.success(`Requisición ${approvalDialog.action === 'approve' ? 'aprobada' : 'rechazada'}`);
      setApprovalDialog({ open: false, req: null, action: null });
      setApprovalComment('');
      loadRequisitions();
    } catch (error) {
      toast.error(error.message || 'Error en la acción');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      department: '',
      requesting_area: '',
      justification: '',
      positions_count: 1,
      salary_min: '',
      salary_max: '',
      currency: 'GTQ',
      job_type: 'full_time',
      location: '',
      requirements: '',
      benefits: '',
      empresa_id: ''
    });
  };

  const filteredRequisitions = requisitions.filter(req => 
    req.title.toLowerCase().includes(search.toLowerCase()) ||
    req.department.toLowerCase().includes(search.toLowerCase())
  );

  const canApprove = hasRole(['admin', 'hiring_manager']);

  return (
    <div className="space-y-6" data-testid="requisitions-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Requisiciones de Personal</h1>
          <p className="text-slate-500 mt-1">Gestiona las solicitudes de plaza</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setEditingReq(null); setShowForm(true); }}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="new-requisition-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Requisición
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por título o departamento..."
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
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="pending_approval">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobadas</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
                <SelectItem value="closed">Cerradas</SelectItem>
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
                <SortHeader label="Título" field="title" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Empresa" field="empresa_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Departamento" field="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Posiciones" field="positions_count" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <TableHead>Rango Salarial</TableHead>
                <SortHeader label="Estado" field="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Fecha" field="created_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
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
              ) : filteredRequisitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                    No hay requisiciones
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems(filteredRequisitions).map((req) => {
                  const status = REQUISITION_STATUS[req.status];
                  return (
                    <TableRow key={req.id} className="hover:bg-slate-50" data-testid={`requisition-row-${req.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{req.title}</p>
                          <p className="text-xs text-slate-500">{req.requesting_area}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{req.empresa_name || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-slate-400" />
                          {req.department}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-slate-400" />
                          {req.positions_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-emerald-500" />
                          <span className="text-sm">{formatCurrency(req.salary_min, req.currency)} - {formatCurrency(req.salary_max, req.currency)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={status?.color}>{status?.label}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatDate(req.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`requisition-menu-${req.id}`}>
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/requisitions/${req.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                            {req.status === 'draft' && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(req)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSubmitForApproval(req.id)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Enviar a Aprobación
                                </DropdownMenuItem>
                              </>
                            )}
                            {req.status === 'pending_approval' && canApprove && (
                              <>
                                <DropdownMenuItem onClick={() => setApprovalDialog({ open: true, req, action: 'approve' })}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Aprobar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setApprovalDialog({ open: true, req, action: 'reject' })}>
                                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                  Rechazar
                                </DropdownMenuItem>
                              </>
                            )}
                            {req.status === 'approved' && !req.vacancy_id && (
                              <DropdownMenuItem onClick={() => navigate(`/vacancies/new?requisition=${req.id}`)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Crear Vacante
                              </DropdownMenuItem>
                            )}
                            {req.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleDelete(req.id)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
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
            <DialogTitle>{editingReq ? 'Editar Requisición' : 'Nueva Requisición'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Título del Puesto *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Desarrollador Full Stack Senior"
                  required
                  data-testid="req-title-input"
                />
              </div>
              {companies.length > 0 && (
                <div className="col-span-2 space-y-2">
                  <Label>Empresa</Label>
                  <Select value={formData.empresa_id || 'none'} onValueChange={v => setFormData({ ...formData, empresa_id: v === 'none' ? '' : v })}>
                    <SelectTrigger data-testid="req-empresa-select">
                      <SelectValue placeholder="Selecciona empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin empresa específica</SelectItem>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Departamento *</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Ej: Tecnología"
                  required
                  data-testid="req-department-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Área Solicitante *</Label>
                <Input
                  value={formData.requesting_area}
                  onChange={(e) => setFormData({ ...formData, requesting_area: e.target.value })}
                  placeholder="Ej: Desarrollo de Software"
                  required
                  data-testid="req-area-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Empleo</Label>
                <Select value={formData.job_type} onValueChange={(v) => setFormData({ ...formData, job_type: v })}>
                  <SelectTrigger data-testid="req-jobtype-select">
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
                <Label>Número de Posiciones</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.positions_count}
                  onChange={(e) => setFormData({ ...formData, positions_count: e.target.value })}
                  data-testid="req-positions-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Salario Mínimo *</Label>
                <Input
                  type="number"
                  value={formData.salary_min}
                  onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                  placeholder="0"
                  required
                  data-testid="req-salarymin-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Salario Máximo *</Label>
                <Input
                  type="number"
                  value={formData.salary_max}
                  onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                  placeholder="0"
                  required
                  data-testid="req-salarymax-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger data-testid="req-currency-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Ubicación</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ej: Ciudad de México / Remoto"
                  data-testid="req-location-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Justificación *</Label>
                <Textarea
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Justifique la necesidad de esta posición..."
                  required
                  rows={3}
                  data-testid="req-justification-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Requisitos</Label>
                <Textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="Lista de requisitos del puesto..."
                  rows={3}
                  data-testid="req-requirements-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Beneficios</Label>
                <Textarea
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  placeholder="Beneficios ofrecidos..."
                  rows={2}
                  data-testid="req-benefits-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="req-submit-btn">
                {editingReq ? 'Actualizar' : 'Crear Requisición'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => !open && setApprovalDialog({ open: false, req: null, action: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.action === 'approve' ? 'Aprobar Requisición' : 'Rechazar Requisición'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 mb-4">
              {approvalDialog.action === 'approve' 
                ? '¿Confirma la aprobación de esta requisición?'
                : '¿Confirma el rechazo de esta requisición?'}
            </p>
            <div className="space-y-2">
              <Label>Comentarios</Label>
              <Textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Agregar comentarios..."
                data-testid="approval-comment-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog({ open: false, req: null, action: null })}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApproval}
              className={approvalDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              data-testid="confirm-approval-btn"
            >
              {approvalDialog.action === 'approve' ? (
                <><CheckCircle className="mr-2 h-4 w-4" />Aprobar</>
              ) : (
                <><XCircle className="mr-2 h-4 w-4" />Rechazar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
