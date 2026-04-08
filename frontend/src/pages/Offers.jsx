import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, formatCurrency, formatDate, OFFER_STATUS } from '../lib/utils';
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
  DollarSign,
  Calendar,
  Send,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Eye,
  UserCheck,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export const Offers = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [currencies, setCurrencies] = useState([]);

  const initialFormState = {
    application_id: '',
    position_title: '',
    base_salary: '',
    currency: 'GTQ',
    bonus: '',
    benefits: '',
    start_date: '',
    expiration_date: '',
    contract_type: 'indefinite',
    additional_terms: ''
  };

  const editFormInitialState = {
    position_title: '',
    base_salary: '',
    currency: 'GTQ',
    bonus: '',
    benefits: '',
    start_date: '',
    expiration_date: '',
    contract_type: 'indefinite',
    additional_terms: '',
    status: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editFormData, setEditFormData] = useState(editFormInitialState);

  const loadOffers = React.useCallback(async () => {
    try {
      const endpoint = statusFilter !== 'all' 
        ? `/offers?status=${statusFilter}` 
        : '/offers';
      const data = await apiRequest(endpoint);
      setOffers(data.items || []);
    } catch (error) {
      console.error('Error loading offers:', error);
      toast.error('Error al cargar ofertas');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadApplications = async () => {
    try {
      const data = await apiRequest('/applications?stage=finalist&limit=100');
      setApplications(data.items || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const loadCurrencies = async () => {
    try {
      const data = await apiRequest('/currencies');
      setCurrencies(data || []);
    } catch (error) {
      console.error('Error loading currencies:', error);
    }
  };

  useEffect(() => {
    loadOffers();
    loadApplications();
    loadCurrencies();
  }, [loadOffers]);

  const handleEditOffer = (offer) => {
    setEditingOffer(offer);
    setEditFormData({
      position_title: offer.position_title || '',
      base_salary: offer.base_salary || '',
      currency: offer.currency || 'GTQ',
      bonus: offer.bonus || '',
      benefits: offer.benefits || '',
      start_date: offer.start_date ? offer.start_date.split('T')[0] : '',
      expiration_date: offer.expiration_date ? offer.expiration_date.split('T')[0] : '',
      contract_type: offer.contract_type || 'indefinite',
      additional_terms: offer.additional_terms || '',
      status: offer.status || '',
      notes: offer.notes || ''
    });
    setShowEditForm(true);
  };

  const handleUpdateOffer = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        position_title: editFormData.position_title,
        base_salary: parseFloat(editFormData.base_salary),
        currency: editFormData.currency,
        bonus: editFormData.bonus ? parseFloat(editFormData.bonus) : null,
        benefits: editFormData.benefits || null,
        start_date: editFormData.start_date ? new Date(editFormData.start_date).toISOString() : null,
        expiration_date: editFormData.expiration_date ? new Date(editFormData.expiration_date).toISOString() : null,
        contract_type: editFormData.contract_type,
        additional_terms: editFormData.additional_terms || null,
        status: editFormData.status,
        notes: editFormData.notes || null
      };
      
      await apiRequest(`/offers/${editingOffer.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      
      toast.success('Oferta actualizada');
      setShowEditForm(false);
      setEditingOffer(null);
      loadOffers();
    } catch (error) {
      toast.error(error.message || 'Error al actualizar oferta');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        base_salary: parseFloat(formData.base_salary),
        bonus: formData.bonus ? parseFloat(formData.bonus) : null,
        start_date: new Date(formData.start_date).toISOString(),
        expiration_date: new Date(formData.expiration_date).toISOString()
      };

      await apiRequest('/offers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      toast.success('Oferta creada');
      setShowForm(false);
      setFormData(initialFormState);
      loadOffers();
    } catch (error) {
      toast.error(error.message || 'Error al crear oferta');
    }
  };

  const handleSend = async (id) => {
    try {
      await apiRequest(`/offers/${id}/send`, { method: 'POST' });
      toast.success('Oferta enviada');
      loadOffers();
    } catch (error) {
      toast.error('Error al enviar');
    }
  };

  const handleAccept = async (id) => {
    try {
      await apiRequest(`/offers/${id}/accept`, { method: 'POST' });
      toast.success('Oferta aceptada');
      loadOffers();
    } catch (error) {
      toast.error('Error al aceptar');
    }
  };

  const handleReject = async (id) => {
    try {
      await apiRequest(`/offers/${id}/reject`, { method: 'POST' });
      toast.success('Oferta rechazada');
      loadOffers();
    } catch (error) {
      toast.error('Error al rechazar');
    }
  };

  const handleProcessHiring = async (offerId) => {
    if (!window.confirm('¿Procesar la contratación para esta oferta aceptada?')) return;
    try {
      const result = await apiRequest(`/offers/${offerId}/process-hiring`, { method: 'POST' });
      toast.success(`Contratación procesada. Empleado: ${result.employee_number}`);
      loadOffers();
    } catch (error) {
      toast.error(error.message || 'Error al procesar contratación');
    }
  };

  const CONTRACT_TYPES = [
    { value: 'indefinite', label: 'Indefinido' },
    { value: 'fixed', label: 'Plazo Fijo' },
    { value: 'temporary', label: 'Temporal' },
    { value: 'contract', label: 'Por Proyecto' }
  ];

  return (
    <div className="space-y-6" data-testid="offers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Ofertas Laborales</h1>
          <p className="text-slate-500 mt-1">Gestiona las ofertas a candidatos</p>
        </div>
        <Button 
          onClick={() => { setFormData(initialFormState); setShowForm(true); }}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="new-offer-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Oferta
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="status-filter">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="sent">Enviadas</SelectItem>
              <SelectItem value="accepted">Aceptadas</SelectItem>
              <SelectItem value="rejected">Rechazadas</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Posición</TableHead>
                <TableHead>Salario</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Expira</TableHead>
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
              ) : offers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                    No hay ofertas
                  </TableCell>
                </TableRow>
              ) : (
                offers.map((offer) => {
                  const status = OFFER_STATUS[offer.status];
                  return (
                    <TableRow key={offer.id} className="hover:bg-slate-50" data-testid={`offer-row-${offer.id}`}>
                      <TableCell>
                        <p className="font-medium text-slate-900">{offer.candidate_name}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{offer.empresa_name || '-'}</span>
                      </TableCell>
                      <TableCell>{offer.vacancy_title || offer.position_title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-emerald-500" />
                          <span>{offer.currency || 'GTQ'} {formatCurrency(offer.base_salary)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(offer.start_date)}</TableCell>
                      <TableCell>{formatDate(offer.expiration_date)}</TableCell>
                      <TableCell>
                        <Badge className={status?.color}>{status?.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`offer-menu-${offer.id}`}>
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditOffer(offer)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Editar Oferta
                            </DropdownMenuItem>
                            {(offer.status === 'draft' || offer.status === 'pending') && (
                              <DropdownMenuItem onClick={() => handleSend(offer.id)}>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar Oferta
                              </DropdownMenuItem>
                            )}
                            {offer.status === 'sent' && (
                              <>
                                <DropdownMenuItem onClick={() => handleAccept(offer.id)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Marcar Aceptada
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReject(offer.id)}>
                                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                  Marcar Rechazada
                                </DropdownMenuItem>
                              </>
                            )}
                            {offer.status === 'accepted' && (
                              <DropdownMenuItem onClick={() => handleProcessHiring(offer.id)}>
                                <UserCheck className="mr-2 h-4 w-4 text-cyan-600" />
                                Procesar Contratación
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

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Oferta Laboral</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Candidato (Aplicación) *</Label>
              <Select 
                value={formData.application_id} 
                onValueChange={(v) => setFormData({ ...formData, application_id: v })}
              >
                <SelectTrigger data-testid="offer-application-select">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.candidate?.first_name} {app.candidate?.last_name} - {app.vacancy_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título de Posición *</Label>
              <Input
                value={formData.position_title}
                onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                required
                data-testid="offer-title-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Salario Base *</Label>
                <Input
                  type="number"
                  value={formData.base_salary}
                  onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                  required
                  data-testid="offer-salary-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Bono</Label>
                <Input
                  type="number"
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                  data-testid="offer-bonus-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  data-testid="offer-startdate-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Expiración *</Label>
                <Input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  required
                  data-testid="offer-expdate-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select value={formData.contract_type} onValueChange={(v) => setFormData({ ...formData, contract_type: v })}>
                <SelectTrigger data-testid="offer-contract-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Beneficios</Label>
              <Textarea
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                rows={2}
                data-testid="offer-benefits-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Términos Adicionales</Label>
              <Textarea
                value={formData.additional_terms}
                onChange={(e) => setFormData({ ...formData, additional_terms: e.target.value })}
                rows={2}
                data-testid="offer-terms-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="offer-submit-btn">
                Crear Oferta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Offer Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Oferta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateOffer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Título del Puesto *</Label>
                <Input
                  required
                  value={editFormData.position_title}
                  onChange={(e) => setEditFormData({ ...editFormData, position_title: e.target.value })}
                  data-testid="edit-offer-position-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Salario Base *</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={editFormData.base_salary}
                  onChange={(e) => setEditFormData({ ...editFormData, base_salary: e.target.value })}
                  data-testid="edit-offer-salary-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Moneda *</Label>
                <Select value={editFormData.currency} onValueChange={(v) => setEditFormData({ ...editFormData, currency: v })}>
                  <SelectTrigger data-testid="edit-offer-currency-select">
                    <SelectValue placeholder="Moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.length > 0 ? currencies.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                    )) : (
                      <>
                        <SelectItem value="GTQ">GTQ - Quetzal</SelectItem>
                        <SelectItem value="USD">USD - Dólar</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bono</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.bonus}
                  onChange={(e) => setEditFormData({ ...editFormData, bonus: e.target.value })}
                  data-testid="edit-offer-bonus-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select value={editFormData.contract_type} onValueChange={(v) => setEditFormData({ ...editFormData, contract_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinite">Indefinido</SelectItem>
                    <SelectItem value="fixed">Plazo Fijo</SelectItem>
                    <SelectItem value="temporary">Temporal</SelectItem>
                    <SelectItem value="contract">Por Proyecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Inicio *</Label>
                <Input
                  type="date"
                  required
                  value={editFormData.start_date}
                  onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  data-testid="edit-offer-start-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Expiración *</Label>
                <Input
                  type="date"
                  required
                  value={editFormData.expiration_date}
                  onChange={(e) => setEditFormData({ ...editFormData, expiration_date: e.target.value })}
                  data-testid="edit-offer-expiration-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Estado</Label>
                <Select value={editFormData.status} onValueChange={(v) => setEditFormData({ ...editFormData, status: v })}>
                  <SelectTrigger data-testid="edit-offer-status-select">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="sent">Enviada</SelectItem>
                    <SelectItem value="accepted">Aceptada</SelectItem>
                    <SelectItem value="rejected">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Beneficios</Label>
                <Textarea
                  value={editFormData.benefits}
                  onChange={(e) => setEditFormData({ ...editFormData, benefits: e.target.value })}
                  rows={2}
                  placeholder="Beneficios incluidos en la oferta..."
                  data-testid="edit-offer-benefits-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Términos Adicionales</Label>
                <Textarea
                  value={editFormData.additional_terms}
                  onChange={(e) => setEditFormData({ ...editFormData, additional_terms: e.target.value })}
                  rows={2}
                  placeholder="Términos adicionales..."
                  data-testid="edit-offer-terms-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows={2}
                  placeholder="Notas adicionales sobre la oferta..."
                  data-testid="edit-offer-notes-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="edit-offer-submit-btn">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
