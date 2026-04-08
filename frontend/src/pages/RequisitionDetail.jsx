import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest, REQUISITION_STATUS, formatCurrency, formatDate, JOB_TYPES } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  Eye,
  Plus,
  Send,
  FileText
} from 'lucide-react';

export const RequisitionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [requisition, setRequisition] = useState(null);
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    try {
      const req = await apiRequest(`/requisitions/${id}`);
      setRequisition(req);
      if (req.vacancy_id) {
        try {
          const vac = await apiRequest(`/vacancies/${req.vacancy_id}`);
          setVacancy(vac);
        } catch {
          // no vacancy linked
        }
      }
    } catch (error) {
      console.error('Error loading requisition:', error);
      toast.error('Error al cargar la requisición');
      navigate('/requisitions');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitForApproval = async () => {
    try {
      await apiRequest(`/requisitions/${id}/submit`, { method: 'POST' });
      toast.success('Requisición enviada a aprobación');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Error al enviar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!requisition) return null;

  const status = REQUISITION_STATUS[requisition.status];

  return (
    <div className="space-y-6" data-testid="requisition-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/requisitions')} data-testid="back-button">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">{requisition.title}</h1>
          <p className="text-slate-500">Detalle de Requisición</p>
        </div>
        <Badge className={status?.color}>{status?.label}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Departamento</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 size={14} className="text-slate-400" />
                    <span className="text-slate-900">{requisition.department}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Área Solicitante</p>
                  <p className="text-slate-900 mt-1">{requisition.requesting_area}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Posiciones</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Users size={14} className="text-slate-400" />
                    <span className="text-slate-900">{requisition.positions_count}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Tipo de Empleo</p>
                  <p className="text-slate-900 mt-1">
                    {JOB_TYPES.find(t => t.value === requisition.job_type)?.label || requisition.job_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Rango Salarial</p>
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSign size={14} className="text-emerald-500" />
                    <span className="text-slate-900 text-sm">
                      {formatCurrency(requisition.salary_min, requisition.currency)} – {formatCurrency(requisition.salary_max, requisition.currency)}
                    </span>
                  </div>
                </div>
                {requisition.location && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Ubicación</p>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="text-slate-900">{requisition.location}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Justificación</p>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{requisition.justification}</p>
              </div>

              {requisition.requirements && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Requisitos del Puesto</p>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{requisition.requirements}</p>
                  </div>
                </>
              )}

              {requisition.benefits && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Beneficios</p>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{requisition.benefits}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Approval Chain */}
          {requisition.approval_chain?.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Cadena de Aprobación</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requisition.approval_chain.map((approval, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                      {approval.action === 'approve' ? (
                        <CheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={16} />
                      ) : (
                        <XCircle className="text-red-500 mt-0.5 flex-shrink-0" size={16} />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900 text-sm">{approval.user_name}</p>
                          <p className="text-xs text-slate-400">{formatDate(approval.timestamp)}</p>
                        </div>
                        {approval.comments && (
                          <p className="text-sm text-slate-600 mt-1">{approval.comments}</p>
                        )}
                        <Badge
                          className={`mt-1 text-xs ${approval.action === 'approve' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                        >
                          {approval.action === 'approve' ? 'Aprobada' : 'Rechazada'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Fecha de Creación</p>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-700">{formatDate(requisition.created_at)}</span>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                {requisition.status === 'draft' && hasRole(['admin', 'recruiter', 'hiring_manager']) && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleSubmitForApproval}
                    data-testid="submit-approval-btn"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar a Aprobación
                  </Button>
                )}
                {requisition.status === 'approved' && !requisition.vacancy_id && (
                  <Button
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => navigate(`/vacancies?requisition=${requisition.id}`)}
                    data-testid="create-vacancy-btn"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Vacante
                  </Button>
                )}
                {vacancy && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/pipeline?vacancy=${vacancy.id}`)}
                    data-testid="view-pipeline-btn"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Pipeline
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/requisitions')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Listado
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Linked Vacancy */}
          {vacancy && (
            <Card className="border-cyan-200 bg-cyan-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase size={16} className="text-cyan-600" />
                  Vacante Vinculada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium text-slate-900 text-sm">{vacancy.title}</p>
                <Badge className={
                  vacancy.status === 'published' ? 'bg-green-50 text-green-700' :
                  vacancy.status === 'draft' ? 'bg-slate-50 text-slate-700' :
                  'bg-red-50 text-red-700'
                }>
                  {vacancy.status === 'published' ? 'Publicada' :
                   vacancy.status === 'draft' ? 'Borrador' : 'Cerrada'}
                </Badge>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users size={12} />
                  <span>{vacancy.applications_count || 0} aplicaciones</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/pipeline?vacancy=${vacancy.id}`)}
                >
                  <Eye className="mr-2 h-3 w-3" />
                  Ver Pipeline
                </Button>
              </CardContent>
            </Card>
          )}

          {/* No vacancy yet */}
          {!vacancy && requisition.status === 'approved' && (
            <Card className="border-dashed border-slate-300">
              <CardContent className="p-6 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sin vacante vinculada</p>
                <Button
                  size="sm"
                  className="mt-3 bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => navigate(`/vacancies?requisition=${requisition.id}`)}
                >
                  Crear Vacante
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
