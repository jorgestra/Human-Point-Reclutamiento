import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, formatCurrency, formatDate } from '../lib/utils';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { 
  Plus, 
  UserCheck,
  DollarSign,
  Calendar,
  Building2,
  Briefcase,
  CheckCircle
  ChevronUp,
  ChevronDown
} from 'lucide-react';


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

export const Hirings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hirings, setHirings] = useState([]);
  const [acceptedOffers, setAcceptedOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const initialFormState = {
    application_id: searchParams.get('application') || '',
    offer_id: searchParams.get('offer') || '',
    employee_number: '',
    department: '',
    position: '',
    start_date: '',
    contract_type: 'indefinite',
    salary: '',
    supervisor_id: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadHirings = async () => {
    try {
      const data = await apiRequest('/hirings');
      setHirings(data.items || []);
    } catch (error) {
      console.error('Error loading hirings:', error);
      toast.error('Error al cargar contrataciones');
    } finally {
      setLoading(false);
    }
  };

  const loadAcceptedOffers = async () => {
    try {
      const data = await apiRequest('/offers?status=accepted');
      setAcceptedOffers(data.items || []);
    } catch (error) {
      console.error('Error loading offers:', error);
    }
  };

  const loadOfferData = async (offerId) => {
    try {
      const offer = await apiRequest(`/offers/${offerId}`);
      setFormData(prev => ({
        ...prev,
        offer_id: offerId,
        application_id: offer.application_id,
        position: offer.position_title,
        salary: offer.base_salary,
        start_date: offer.start_date?.split('T')[0] || '',
        contract_type: offer.contract_type
      }));
    } catch (error) {
      console.error('Error loading offer:', error);
    }
  };

  
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
    loadHirings();
    loadAcceptedOffers();
  }, []);

  useEffect(() => {
    if (searchParams.get('offer')) {
      loadOfferData(searchParams.get('offer'));
      setShowForm(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        salary: parseFloat(formData.salary),
        start_date: new Date(formData.start_date).toISOString()
      };

      await apiRequest('/hirings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      toast.success('Contratación procesada. Empleado creado en el sistema.');
      setShowForm(false);
      setFormData(initialFormState);
      loadHirings();
      loadAcceptedOffers();
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
    <div className="space-y-6" data-testid="hirings-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Contrataciones</h1>
          <p className="text-slate-500 mt-1">Conversión de candidatos a empleados</p>
        </div>
        <Button 
          onClick={() => { setFormData(initialFormState); setShowForm(true); }}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="new-hiring-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Contratación
        </Button>
      </div>

      {/* Pending Offers Alert */}
      {acceptedOffers.length > 0 && (
        <Card className="border-cyan-200 bg-cyan-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-cyan-600" size={20} />
              <span className="text-cyan-800">
                Tienes {acceptedOffers.length} oferta(s) aceptada(s) pendiente(s) de contratación
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowForm(true)}
              className="border-cyan-600 text-cyan-600 hover:bg-cyan-100"
            >
              Procesar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="No. Empleado" field="employee_number" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Posición" field="position" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Departamento" field="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Salario" field="salary" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Fecha Ingreso" field="start_date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : hirings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    No hay contrataciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems(hirings).map((hiring) => (
                  <TableRow key={hiring.id} className="hover:bg-slate-50" data-testid={`hiring-row-${hiring.id}`}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {hiring.employee_number}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-slate-400" />
                        {hiring.position}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-slate-400" />
                        {hiring.department}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} className="text-emerald-500" />
                        {formatCurrency(hiring.salary)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {formatDate(hiring.start_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hiring.employee_record_created ? (
                        <Badge className="bg-green-50 text-green-700">
                          <CheckCircle className="mr-1" size={12} />
                          Empleado Creado
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Procesar Contratación</DialogTitle>
            <DialogDescription>
              Al completar este formulario, se creará automáticamente el registro del empleado en Human Point.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Oferta Aceptada *</Label>
              <Select 
                value={formData.offer_id} 
                onValueChange={(v) => {
                  const offer = acceptedOffers.find(o => o.id === v);
                  if (offer) {
                    setFormData({ 
                      ...formData, 
                      offer_id: v,
                      application_id: offer.application_id,
                      position: offer.position_title,
                      salary: offer.base_salary,
                      start_date: offer.start_date?.split('T')[0] || '',
                      contract_type: offer.contract_type
                    });
                  }
                }}
              >
                <SelectTrigger data-testid="hiring-offer-select">
                  <SelectValue placeholder="Seleccione una oferta" />
                </SelectTrigger>
                <SelectContent>
                  {acceptedOffers.map(offer => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.candidate_name} - {offer.position_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>No. Empleado</Label>
                <Input
                  value={formData.employee_number}
                  onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                  placeholder="Auto-generado si vacío"
                  data-testid="hiring-empnum-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Departamento *</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                  data-testid="hiring-dept-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Posición *</Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
                data-testid="hiring-position-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Salario *</Label>
                <Input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  required
                  data-testid="hiring-salary-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Ingreso *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  data-testid="hiring-startdate-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Contrato *</Label>
              <Select value={formData.contract_type} onValueChange={(v) => setFormData({ ...formData, contract_type: v })}>
                <SelectTrigger data-testid="hiring-contract-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700" data-testid="hiring-submit-btn">
                <UserCheck className="mr-2 h-4 w-4" />
                Completar Contratación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
