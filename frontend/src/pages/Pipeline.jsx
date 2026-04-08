import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, PIPELINE_STAGES, formatDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  GripVertical, 
  User, 
  Mail, 
  MapPin, 
  DollarSign,
  Calendar,
  MoreHorizontal,
  Eye,
  ArrowRight,
  Filter
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const STAGE_ORDER = ['applied', 'pre_filter', 'interview_hr', 'interview_tech', 'tests', 'finalist', 'offer', 'hired', 'rejected'];

export const Pipeline = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pipeline, setPipeline] = useState({});
  const [vacancies, setVacancies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedVacancy, setSelectedVacancy] = useState(searchParams.get('vacancy') || 'all');
  const [selectedEmpresa, setSelectedEmpresa] = useState('all');
  const [loading, setLoading] = useState(true);
  const [moveDialog, setMoveDialog] = useState({ open: false, app: null, newStage: null });
  const [moveNotes, setMoveNotes] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);

  const loadPipeline = useCallback(async () => {
    try {
      let endpoint = '/pipeline';
      const params = [];
      if (selectedVacancy !== 'all') params.push(`vacancy_id=${selectedVacancy}`);
      if (selectedEmpresa !== 'all') params.push(`empresa_id=${selectedEmpresa}`);
      if (params.length > 0) endpoint += '?' + params.join('&');
      
      const data = await apiRequest(endpoint);
      setPipeline(data);
    } catch (error) {
      console.error('Error loading pipeline:', error);
      toast.error('Error al cargar el pipeline');
    } finally {
      setLoading(false);
    }
  }, [selectedVacancy, selectedEmpresa]);

  const loadVacancies = async () => {
    try {
      const data = await apiRequest('/vacancies?status=published&limit=100');
      setVacancies(data.items || []);
    } catch (error) {
      console.error('Error loading vacancies:', error);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await apiRequest('/companies');
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  useEffect(() => {
    loadVacancies();
    loadCompanies();
  }, []);

  useEffect(() => {
    loadPipeline();
  }, [loadPipeline]);

  const handleDragStart = (e, app, stage) => {
    setDraggedItem({ app, fromStage: stage });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, toStage) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.fromStage === toStage) {
      setDraggedItem(null);
      return;
    }

    setMoveDialog({
      open: true,
      app: draggedItem.app,
      newStage: toStage
    });
    setDraggedItem(null);
  };

  const confirmMove = async () => {
    if (!moveDialog.app || !moveDialog.newStage) return;

    try {
      await apiRequest(`/applications/${moveDialog.app.id}/move`, {
        method: 'POST',
        body: JSON.stringify({ new_stage: moveDialog.newStage, notes: moveNotes })
      });
      toast.success(`Candidato movido a ${PIPELINE_STAGES[moveDialog.newStage]?.label}`);
      loadPipeline();
    } catch (error) {
      toast.error('Error al mover candidato');
    } finally {
      setMoveDialog({ open: false, app: null, newStage: null });
      setMoveNotes('');
    }
  };

  const getInitials = (candidate) => {
    if (!candidate) return '??';
    return `${candidate.first_name?.[0] || ''}${candidate.last_name?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pipeline-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Pipeline de Reclutamiento</h1>
          <p className="text-slate-500 mt-1">Arrastra candidatos entre etapas</p>
        </div>
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-slate-400" />
          <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
            <SelectTrigger className="w-48" data-testid="empresa-filter">
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedVacancy} onValueChange={setSelectedVacancy}>
            <SelectTrigger className="w-56" data-testid="vacancy-filter">
              <SelectValue placeholder="Filtrar por vacante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las vacantes</SelectItem>
              {vacancies.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STAGE_ORDER.filter(stage => stage !== 'rejected').map((stage) => {
            const stageInfo = PIPELINE_STAGES[stage];
            const cards = pipeline[stage] || [];
            
            return (
              <div
                key={stage}
                className="w-72 flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
                data-testid={`pipeline-column-${stage}`}
              >
                <Card className="border-slate-200 bg-slate-50/50">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: stageInfo?.bgColor }} />
                        <CardTitle className="text-sm font-semibold">{stageInfo?.label}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {cards.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2 min-h-[400px]">
                    {cards.map((app) => (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app, stage)}
                        className="bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:border-cyan-300 hover:shadow-md transition-all"
                        data-testid={`pipeline-card-${app.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <GripVertical size={14} className="text-slate-300" />
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                                {getInitials(app.candidate)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/candidates/${app.candidate_id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Candidato
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/interviews?application=${app.id}`)}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Agendar Entrevista
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="font-medium text-sm text-slate-900">
                            {app.candidate?.first_name} {app.candidate?.last_name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {app.vacancy_title}
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {app.candidate?.email && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Mail size={10} />
                              <span className="truncate max-w-[100px]">{app.candidate.email}</span>
                            </div>
                          )}
                        </div>

                        {app.candidate?.expected_salary && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                            <DollarSign size={10} />
                            <span>${app.candidate.expected_salary.toLocaleString()}</span>
                          </div>
                        )}

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            {formatDate(app.created_at)}
                          </span>
                          {app.score && (
                            <Badge variant="outline" className="text-xs">
                              Score: {app.score}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}

                    {cards.length === 0 && (
                      <div className="h-32 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                        Sin candidatos
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {/* Rejected Column */}
          <div
            className="w-72 flex-shrink-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'rejected')}
            data-testid="pipeline-column-rejected"
          >
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-200" />
                    <CardTitle className="text-sm font-semibold text-red-700">Rechazado</CardTitle>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {(pipeline['rejected'] || []).length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2 space-y-2 min-h-[400px]">
                {(pipeline['rejected'] || []).map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-lg border border-red-100 p-3 opacity-70"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-red-50 text-red-600 text-xs">
                          {getInitials(app.candidate)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm text-slate-700">
                          {app.candidate?.first_name} {app.candidate?.last_name}
                        </p>
                        <p className="text-xs text-slate-400">{app.vacancy_title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Move Confirmation Dialog */}
      <Dialog open={moveDialog.open} onOpenChange={(open) => !open && setMoveDialog({ open: false, app: null, newStage: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Candidato</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 mb-4">
              ¿Mover a <strong>{moveDialog.app?.candidate?.first_name} {moveDialog.app?.candidate?.last_name}</strong> a{' '}
              <strong className="text-cyan-600">{PIPELINE_STAGES[moveDialog.newStage]?.label}</strong>?
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Notas (opcional)</label>
              <Textarea
                placeholder="Agregar notas sobre este movimiento..."
                value={moveNotes}
                onChange={(e) => setMoveNotes(e.target.value)}
                data-testid="move-notes-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog({ open: false, app: null, newStage: null })}>
              Cancelar
            </Button>
            <Button onClick={confirmMove} className="bg-cyan-600 hover:bg-cyan-700" data-testid="confirm-move-btn">
              <ArrowRight className="mr-2 h-4 w-4" />
              Confirmar Movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
