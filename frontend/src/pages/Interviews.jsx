import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, formatDate, formatDateTime } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  User,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  List,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Edit,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const INTERVIEW_TYPES = [
  { value: 'hr', label: 'Entrevista RH' },
  { value: 'technical', label: 'Entrevista Técnica' },
  { value: 'cultural', label: 'Fit Cultural' },
  { value: 'final', label: 'Entrevista Final' },
  { value: 'exam', label: 'Examen' }
];

const INTERVIEW_STATUS = {
  scheduled: { label: 'Programada', color: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Completada', color: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelada', color: 'bg-red-50 text-red-700' },
  no_show: { label: 'No se presentó', color: 'bg-yellow-50 text-yellow-700' }
};

// ─── Calendar Day Cell ────────────────────────────────────────────────────────
const CalendarDay = ({ day, interviews, currentMonth, onSelectDay, selectedDay }) => {
  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isSelected = selectedDay && isSameDay(day, selectedDay);
  const today = new Date();
  const isToday = isSameDay(day, today);
  const dayInterviews = interviews.filter(i => isSameDay(new Date(i.scheduled_at), day));

  return (
    <div
      className={`min-h-[80px] p-1.5 border-b border-r border-slate-100 cursor-pointer transition-colors ${
        isCurrentMonth ? 'bg-white' : 'bg-slate-50/60'
      } ${isSelected ? 'ring-2 ring-cyan-500 ring-inset' : 'hover:bg-slate-50'}`}
      onClick={() => onSelectDay(day)}
    >
      <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
        isToday ? 'bg-cyan-600 text-white' : isCurrentMonth ? 'text-slate-700' : 'text-slate-300'
      }`}>
        {format(day, 'd')}
      </div>
      <div className="space-y-0.5">
        {dayInterviews.slice(0, 2).map(i => (
          <div
            key={i.id}
            className={`text-[10px] px-1 py-0.5 rounded truncate ${
              i.status === 'completed' ? 'bg-green-100 text-green-700' :
              i.status === 'cancelled' ? 'bg-red-100 text-red-600' :
              'bg-blue-100 text-blue-700'
            }`}
          >
            {format(new Date(i.scheduled_at), 'HH:mm')} {i.candidate?.first_name}
          </div>
        ))}
        {dayInterviews.length > 2 && (
          <div className="text-[10px] text-slate-400 pl-1">+{dayInterviews.length - 2} más</div>
        )}
      </div>
    </div>
  );
};

export const Interviews = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [hrPersonnel, setHrPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // list | month | week | day
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [filterEmpresa, setFilterEmpresa] = useState('all');
  const [filterStatus, setFilterStatus] = useState('scheduled'); // Default to scheduled
  const [sortDirection, setSortDirection] = useState('asc'); // asc | desc

  // Completion notes dialog
  const [completionDialog, setCompletionDialog] = useState({ open: false, interviewId: null });
  const [completionNotes, setCompletionNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const initialFormState = {
    application_id: searchParams.get('application') || '',
    scheduled_at: new Date(),
    scheduled_time: '10:00',
    duration_minutes: 60,
    interview_type: 'hr',
    interviewer_id: '',
    location: '',
    meeting_link: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // View/Edit interview states
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [editForm, setEditForm] = useState(null);

  useEffect(() => {
    loadInterviews();
    loadApplications();
    loadCompanies();
    loadHRPersonnel();
  }, []);

  useEffect(() => {
    // Reload when filter changes
    loadInterviews();
  }, [filterEmpresa]);

  useEffect(() => {
    if (searchParams.get('application')) setShowForm(true);
  }, [searchParams]);

  const loadInterviews = async () => {
    try {
      let endpoint = '/interviews';
      const params = [];
      if (filterEmpresa !== 'all') {
        params.push(`empresa_id=${filterEmpresa}`);
      }
      if (params.length > 0) {
        endpoint += '?' + params.join('&');
      }
      const data = await apiRequest(endpoint);
      setInterviews(data || []);
    } catch {
      toast.error('Error al cargar entrevistas');
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const data = await apiRequest('/applications?limit=200');
      setApplications(data.items?.filter(a => a.is_active) || []);
    } catch {
      console.error('Error loading applications');
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await apiRequest('/companies');
      setCompanies(data || []);
    } catch {
      console.error('Error loading companies');
    }
  };

  const loadHRPersonnel = async () => {
    try {
      const data = await apiRequest('/hr-personnel?active_only=true');
      setHrPersonnel(data || []);
    } catch {
      console.error('Error loading HR personnel');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const [hours, minutes] = formData.scheduled_time.split(':');
      const scheduledDate = new Date(formData.scheduled_at);
      scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await apiRequest('/interviews', {
        method: 'POST',
        body: JSON.stringify({
          application_id: formData.application_id,
          scheduled_at: scheduledDate.toISOString(),
          duration_minutes: parseInt(formData.duration_minutes),
          interview_type: formData.interview_type,
          location: formData.location,
          meeting_link: formData.meeting_link,
          notes: formData.notes,
          evaluators: []
        })
      });

      toast.success('Entrevista programada');
      setShowForm(false);
      setFormData(initialFormState);
      loadInterviews();
    } catch (error) {
      toast.error(error.message || 'Error al programar entrevista');
    }
  };

  // Open completion dialog — requires mandatory notes
  const openCompleteDialog = (interviewId) => {
    setCompletionNotes('');
    setCompletionDialog({ open: true, interviewId });
  };

  const handleComplete = async () => {
    if (!completionNotes.trim()) {
      toast.error('Las notas de cierre son obligatorias');
      return;
    }
    setCompleting(true);
    try {
      await apiRequest(`/interviews/${completionDialog.interviewId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ completion_notes: completionNotes.trim() })
      });
      toast.success('Entrevista completada y notas guardadas');
      setCompletionDialog({ open: false, interviewId: null });
      setCompletionNotes('');
      loadInterviews();
    } catch (error) {
      toast.error(error.message || 'Error al completar entrevista');
    } finally {
      setCompleting(false);
    }
  };

  const handleViewInterview = (interview) => {
    setSelectedInterview(interview);
    setShowViewDialog(true);
  };

  const handleEditInterview = (interview) => {
    setSelectedInterview(interview);
    const scheduledDate = new Date(interview.scheduled_at);
    setEditForm({
      scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
      scheduled_time: format(scheduledDate, 'HH:mm'),
      duration_minutes: interview.duration_minutes || 60,
      interview_type: interview.interview_type || 'hr',
      interviewer_id: interview.interviewer_id || '',
      location: interview.location || '',
      meeting_link: interview.meeting_link || '',
      notes: interview.notes || '',
      status: interview.status
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedInterview || !editForm) return;
    try {
      const scheduledAt = new Date(`${editForm.scheduled_date}T${editForm.scheduled_time}:00`);
      const payload = {
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: editForm.duration_minutes,
        interview_type: editForm.interview_type,
        interviewer_id: editForm.interviewer_id,
        location: editForm.location,
        meeting_link: editForm.meeting_link,
        notes: editForm.notes,
        status: editForm.status
      };
      await apiRequest(`/interviews/${selectedInterview.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      toast.success('Entrevista actualizada');
      setShowEditDialog(false);
      setSelectedInterview(null);
      setEditForm(null);
      loadInterviews();
    } catch (error) {
      toast.error(error.message || 'Error al actualizar entrevista');
    }
  };

  const getInitials = (candidate) => {
    if (!candidate) return '??';
    return `${candidate.first_name?.[0] || ''}${candidate.last_name?.[0] || ''}`.toUpperCase();
  };

  // Filtered interviews with sorting
  const filteredInterviews = interviews
    .filter(i => {
      const statusOk = filterStatus === 'all' || i.status === filterStatus;
      return statusOk;
    })
    .sort((a, b) => {
      const dateA = new Date(a.scheduled_at);
      const dateB = new Date(b.scheduled_at);
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

  // Group for list view
  const groupedInterviews = filteredInterviews.reduce((acc, interview) => {
    const date = formatDate(interview.scheduled_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(interview);
    return acc;
  }, {});

  // Calendar helpers
  const calendarNav = {
    month: {
      prev: () => setCalendarDate(subMonths(calendarDate, 1)),
      next: () => setCalendarDate(addMonths(calendarDate, 1)),
      label: format(calendarDate, 'MMMM yyyy', { locale: es })
    },
    week: {
      prev: () => setCalendarDate(subWeeks(calendarDate, 1)),
      next: () => setCalendarDate(addWeeks(calendarDate, 1)),
      label: `Semana del ${format(startOfWeek(calendarDate, { weekStartsOn: 1 }), 'd MMM', { locale: es })} al ${format(endOfWeek(calendarDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: es })}`
    },
    day: {
      prev: () => setCalendarDate(subDays(calendarDate, 1)),
      next: () => setCalendarDate(addDays(calendarDate, 1)),
      label: format(calendarDate, "EEEE d 'de' MMMM yyyy", { locale: es })
    }
  };

  // Day view interviews
  const dayInterviews = filteredInterviews.filter(i => isSameDay(new Date(i.scheduled_at), calendarDate))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  // Selected day interviews (month view click)
  const selectedDayInterviews = selectedDay
    ? filteredInterviews.filter(i => isSameDay(new Date(i.scheduled_at), selectedDay))
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    : [];

  const renderInterviewCard = (interview) => {
    const statusInfo = INTERVIEW_STATUS[interview.status];
    const typeInfo = INTERVIEW_TYPES.find(t => t.value === interview.interview_type);
    return (
      <Card key={interview.id} className="border-slate-200 hover:border-cyan-200 transition-colors" data-testid={`interview-card-${interview.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 text-center flex-shrink-0">
                <p className="text-xl font-bold text-slate-900">
                  {new Date(interview.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-slate-500">{interview.duration_minutes} min</p>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-sm">
                      {getInitials(interview.candidate)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      {interview.candidate?.first_name} {interview.candidate?.last_name}
                    </p>
                    <p className="text-xs text-slate-500">{interview.candidate?.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">{typeInfo?.label}</Badge>
                  <Badge className={`${statusInfo?.color} text-xs`}>{statusInfo?.label}</Badge>
                  {interview.location && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={11} /> {interview.location}
                    </span>
                  )}
                  {interview.meeting_link && (
                    <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700">
                      <Video size={11} /> Reunión virtual
                    </a>
                  )}
                </div>
                {interview.completion_notes && (
                  <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                    <span className="font-semibold">Notas de cierre: </span>
                    {interview.completion_notes}
                  </div>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0" data-testid={`interview-menu-${interview.id}`}>
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleViewInterview(interview)} data-testid={`view-interview-${interview.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Entrevista
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditInterview(interview)} data-testid={`edit-interview-${interview.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Entrevista
                </DropdownMenuItem>
                {interview.status === 'scheduled' && (
                  <DropdownMenuItem onClick={() => openCompleteDialog(interview.id)} data-testid={`complete-interview-${interview.id}`}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Marcar Completada
                  </DropdownMenuItem>
                )}
                {interview.candidate?.id && (
                  <DropdownMenuItem onClick={() => navigate(`/candidates/${interview.candidate.id}`)}>
                    <User className="mr-2 h-4 w-4" />
                    Ver Candidato
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Month grid days
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Week view days
  const weekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
  const weekDaysArr = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const nav = viewMode !== 'list' ? calendarNav[viewMode] : null;

  return (
    <div className="space-y-6" data-testid="interviews-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Entrevistas</h1>
          <p className="text-slate-500 mt-1">Agenda y calendario de entrevistas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-slate-100' : ''} data-testid="view-list-btn">
            <List size={14} className="mr-1.5" /> Lista
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('month')} className={viewMode === 'month' ? 'bg-slate-100' : ''} data-testid="view-month-btn">
            <CalendarIcon size={14} className="mr-1.5" /> Mes
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('week')} className={viewMode === 'week' ? 'bg-slate-100' : ''} data-testid="view-week-btn">
            Semana
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('day')} className={viewMode === 'day' ? 'bg-slate-100' : ''} data-testid="view-day-btn">
            Día
          </Button>
          <Button onClick={() => { setFormData(initialFormState); setShowForm(true); }} className="bg-slate-900 hover:bg-slate-800" data-testid="new-interview-btn">
            <Plus className="mr-2 h-4 w-4" /> Nueva Entrevista
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40" data-testid="status-filter-select">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="scheduled">Programadas</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        {companies.length > 0 && (
          <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
            <SelectTrigger className="w-48" data-testid="empresa-filter-select">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          data-testid="sort-direction-btn"
        >
          {sortDirection === 'asc' ? '↑ Más antiguas primero' : '↓ Más recientes primero'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ─── LIST VIEW ─── */}
          {viewMode === 'list' && (
            Object.keys(groupedInterviews).length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="py-12 text-center text-slate-400">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay entrevistas programadas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedInterviews).map(([date, dayInterviews]) => (
                  <div key={date}>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{date}</h3>
                    <div className="space-y-3">{dayInterviews.map(renderInterviewCard)}</div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ─── MONTH VIEW ─── */}
          {viewMode === 'month' && (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={nav.prev}><ChevronLeft size={18} /></Button>
                  <CardTitle className="text-base capitalize">{nav.label}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={nav.next}><ChevronRight size={18} /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-7 border-t border-slate-100">
                  {weekDays.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 border-b border-r border-slate-100">{d}</div>
                  ))}
                  {gridDays.map(day => (
                    <CalendarDay
                      key={day.toISOString()}
                      day={day}
                      interviews={filteredInterviews}
                      currentMonth={calendarDate}
                      onSelectDay={setSelectedDay}
                      selectedDay={selectedDay}
                    />
                  ))}
                </div>

                {/* Selected day interviews */}
                {selectedDay && selectedDayInterviews.length > 0 && (
                  <div className="p-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700">
                      {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                      <span className="ml-2 text-slate-400 font-normal">({selectedDayInterviews.length} entrevista{selectedDayInterviews.length > 1 ? 's' : ''})</span>
                    </h4>
                    {selectedDayInterviews.map(renderInterviewCard)}
                  </div>
                )}
                {selectedDay && selectedDayInterviews.length === 0 && (
                  <div className="p-4 border-t border-slate-100 text-center text-slate-400 text-sm">
                    Sin entrevistas el {format(selectedDay, "d 'de' MMMM", { locale: es })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── WEEK VIEW ─── */}
          {viewMode === 'week' && (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={nav.prev}><ChevronLeft size={18} /></Button>
                  <CardTitle className="text-sm">{nav.label}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={nav.next}><ChevronRight size={18} /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDaysArr.map(day => {
                    const di = filteredInterviews.filter(i => isSameDay(new Date(i.scheduled_at), day))
                      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={day.toISOString()} className={`rounded-lg p-2 border ${isToday ? 'border-cyan-300 bg-cyan-50/40' : 'border-slate-100'}`}>
                        <div className="text-center mb-2">
                          <p className="text-xs text-slate-500">{format(day, 'EEE', { locale: es })}</p>
                          <p className={`text-base font-bold ${isToday ? 'text-cyan-600' : 'text-slate-800'}`}>{format(day, 'd')}</p>
                        </div>
                        <div className="space-y-1">
                          {di.map(i => (
                            <div key={i.id} className={`text-[10px] px-1.5 py-1 rounded cursor-pointer ${
                              i.status === 'completed' ? 'bg-green-100 text-green-700' :
                              i.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                              'bg-blue-100 text-blue-700'
                            }`} onClick={() => { setSelectedDay(day); setViewMode('day'); setCalendarDate(day); }}>
                              <p className="font-medium">{format(new Date(i.scheduled_at), 'HH:mm')}</p>
                              <p className="truncate">{i.candidate?.first_name}</p>
                            </div>
                          ))}
                          {di.length === 0 && <div className="h-8" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── DAY VIEW ─── */}
          {viewMode === 'day' && (
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={nav.prev}><ChevronLeft size={18} /></Button>
                  <CardTitle className="text-sm capitalize">{nav.label}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={nav.next}><ChevronRight size={18} /></Button>
                </div>
              </CardHeader>
              <CardContent>
                {dayInterviews.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Sin entrevistas programadas para este día</p>
                  </div>
                ) : (
                  <div className="space-y-3">{dayInterviews.map(renderInterviewCard)}</div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ─── COMPLETION NOTES DIALOG ─── */}
      <Dialog open={completionDialog.open} onOpenChange={(o) => !o && setCompletionDialog({ open: false, interviewId: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              Completar Entrevista
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">Las notas de cierre son <strong>obligatorias</strong> para registrar el resultado de la entrevista.</p>
            </div>
            <div className="space-y-2">
              <Label>Notas de Cierre *</Label>
              <Textarea
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                rows={5}
                placeholder="Describa el resultado de la entrevista, observaciones del candidato, puntos destacados, recomendación..."
                className={!completionNotes.trim() ? 'border-red-200' : ''}
                data-testid="completion-notes-input"
                autoFocus
              />
              {!completionNotes.trim() && (
                <p className="text-xs text-red-500">Este campo es obligatorio</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompletionDialog({ open: false, interviewId: null })}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleComplete}
              disabled={completing || !completionNotes.trim()}
              data-testid="confirm-complete-btn"
            >
              {completing ? 'Guardando...' : 'Confirmar y Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CREATE INTERVIEW DIALOG ─── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Programar Entrevista</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Candidato (Aplicación) *</Label>
              <Select value={formData.application_id} onValueChange={v => setFormData({ ...formData, application_id: v })}>
                <SelectTrigger data-testid="interview-application-select">
                  <SelectValue placeholder="Seleccione una aplicación" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.candidate?.first_name} {app.candidate?.last_name} — {app.vacancy_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" data-testid="interview-date-btn">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.scheduled_at ? format(formData.scheduled_at, 'PPP', { locale: es }) : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.scheduled_at}
                      onSelect={date => setFormData({ ...formData, scheduled_at: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <Input type="time" value={formData.scheduled_time} onChange={e => setFormData({ ...formData, scheduled_time: e.target.value })} required data-testid="interview-time-input" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.interview_type} onValueChange={v => setFormData({ ...formData, interview_type: v })}>
                  <SelectTrigger data-testid="interview-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duración</Label>
                <Select value={String(formData.duration_minutes)} onValueChange={v => setFormData({ ...formData, duration_minutes: v })}>
                  <SelectTrigger data-testid="interview-duration-select"><SelectValue /></SelectTrigger>
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
              <Select value={formData.interviewer_id} onValueChange={v => setFormData({ ...formData, interviewer_id: v })}>
                <SelectTrigger data-testid="interview-interviewer-select">
                  <SelectValue placeholder="Seleccione un entrevistador" />
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
                <p className="text-xs text-amber-600">No hay entrevistadores registrados. Agréguelos en Personal RRHH.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Oficina, Sala de juntas..." data-testid="interview-location-input" />
            </div>
            <div className="space-y-2">
              <Label>Enlace de Reunión</Label>
              <Input value={formData.meeting_link} onChange={e => setFormData({ ...formData, meeting_link: e.target.value })} placeholder="https://meet.google.com/..." data-testid="interview-link-input" />
            </div>
            <div className="space-y-2">
              <Label>Notas Previas</Label>
              <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} data-testid="interview-notes-input" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="interview-submit-btn">Programar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Interview Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Entrevista</DialogTitle>
          </DialogHeader>
          {selectedInterview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-slate-100 text-slate-600">
                    {getInitials(selectedInterview.candidate)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-slate-900">
                    {selectedInterview.candidate?.first_name} {selectedInterview.candidate?.last_name}
                  </p>
                  <p className="text-sm text-slate-500">{selectedInterview.vacancy_title}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Fecha y Hora</p>
                  <p className="font-medium">{formatDateTime(selectedInterview.scheduled_at)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Duración</p>
                  <p className="font-medium">{selectedInterview.duration_minutes} min</p>
                </div>
                <div>
                  <p className="text-slate-500">Tipo</p>
                  <p className="font-medium">{INTERVIEW_TYPES.find(t => t.value === selectedInterview.interview_type)?.label || selectedInterview.interview_type}</p>
                </div>
                <div>
                  <p className="text-slate-500">Estado</p>
                  <Badge className={INTERVIEW_STATUS[selectedInterview.status]?.color}>
                    {INTERVIEW_STATUS[selectedInterview.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-500">Entrevistador</p>
                  <p className="font-medium">{selectedInterview.interviewer_name || hrPersonnel.find(p => p.id === selectedInterview.interviewer_id)?.first_name || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Ubicación</p>
                  <p className="font-medium">{selectedInterview.location || '-'}</p>
                </div>
              </div>
              {selectedInterview.meeting_link && (
                <div>
                  <p className="text-slate-500 text-sm">Enlace de reunión</p>
                  <a href={selectedInterview.meeting_link} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline text-sm">
                    {selectedInterview.meeting_link}
                  </a>
                </div>
              )}
              {selectedInterview.notes && (
                <div>
                  <p className="text-slate-500 text-sm">Notas previas</p>
                  <p className="text-slate-700 text-sm">{selectedInterview.notes}</p>
                </div>
              )}
              {selectedInterview.completion_notes && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-green-700 font-medium text-sm">Notas de cierre</p>
                  <p className="text-green-600 text-sm">{selectedInterview.completion_notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Interview Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Entrevista</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={editForm.scheduled_date}
                    onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora *</Label>
                  <Input
                    type="time"
                    value={editForm.scheduled_time}
                    onChange={(e) => setEditForm({ ...editForm, scheduled_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={editForm.interview_type} onValueChange={(v) => setEditForm({ ...editForm, interview_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Programada</SelectItem>
                      <SelectItem value="completed">Completada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                      <SelectItem value="no_show">No se presentó</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Entrevistador</Label>
                <Select value={editForm.interviewer_id} onValueChange={(v) => setEditForm({ ...editForm, interviewer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent>
                    {hrPersonnel.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Enlace de Reunión</Label>
                <Input
                  value={editForm.meeting_link}
                  onChange={(e) => setEditForm({ ...editForm, meeting_link: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleSaveEdit}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
