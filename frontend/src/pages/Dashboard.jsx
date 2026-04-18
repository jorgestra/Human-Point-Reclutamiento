import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, formatCurrency, PIPELINE_STAGES } from '../lib/utils'; // PIPELINE_STAGES como fallback
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Users,
  Briefcase,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  UserPlus,
  Timer
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [filterEmpresa, setFilterEmpresa] = useState('all');
  const [timeToHire, setTimeToHire] = useState(null);
  const [pipelineStages, setPipelineStages] = useState({});

  useEffect(() => {
    loadDashboard();
    loadCompanies();
    loadPipelineStageMap();
  }, []);

  useEffect(() => {
    loadDashboard();
    loadTimeToHire();
  }, [filterEmpresa]);

  const loadPipelineStageMap = async () => {
    try {
      const data = await apiRequest('/pipeline/stages');
      // Crear mapa code -> {name, color} para lookup rápido
      const map = {};
      (data || []).forEach(s => { map[s.code] = { label: s.name, color: 'bg-slate-100 text-slate-700', bgColor: s.color }; });
      setPipelineStages(map);
    } catch {}
  };

  const loadDashboard = async () => {
    try {
      const params = filterEmpresa !== 'all' ? `?empresa_id=${filterEmpresa}` : '';
      const data = await apiRequest(`/reports/dashboard${params}`);
      setStats(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
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

  const loadTimeToHire = async () => {
    try {
      const params = filterEmpresa !== 'all' ? `?empresa_id=${filterEmpresa}` : '';
      const data = await apiRequest(`/metrics/time-to-hire${params}`);
      setTimeToHire(data);
    } catch (error) {
      console.error('Error loading time to hire:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ✅ Nombres correctos del backend (sin stats.stats, directo en stats)
  const statCards = [
    { label: 'Requisiciones Abiertas', value: stats?.open_requisitions || 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Vacantes Publicadas', value: stats?.open_vacancies || 0, icon: Briefcase, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Candidatos Totales', value: stats?.total_candidates || 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Aplicaciones Activas', value: stats?.active_applications || 0, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Entrevistas Pendientes', value: stats?.pending_interviews || 0, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Ofertas Enviadas', value: stats?.pending_offers || 0, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Contrataciones', value: stats?.total_hires || 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  // ✅ Backend devuelve pipeline_stages (no pipeline_distribution)
  const stageMap = Object.keys(pipelineStages).length > 0 ? pipelineStages : PIPELINE_STAGES;
  const pipelineData = (stats?.pipeline_stages || []).map(item => ({
    stage: stageMap[item.stage]?.label || item.stage,
    count: item.count,
    fill: stageMap[item.stage]?.bgColor || '#e2e8f0'
  }));

  // ✅ Backend devuelve sources con _id (no source_breakdown con source)
  const sourceData = (stats?.sources || []).map(item => ({
    source: item._id || 'Otro',
    count: item.count
  }));

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Dashboard</h1>
          <p className="text-slate-500 mt-1">Resumen de actividad de reclutamiento</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {companies.length > 0 && (
            <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
              <SelectTrigger className="w-48" data-testid="dashboard-empresa-filter">
                <SelectValue placeholder="Filtrar por empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Link to="/requisitions?new=true">
            <Button className="bg-slate-900 hover:bg-slate-800" data-testid="new-requisition-btn">
              <FileText className="mr-2 h-4 w-4" />
              Nueva Requisición
            </Button>
          </Link>
          <Link to="/vacancies?new=true">
            <Button variant="outline" className="border-cyan-500 text-cyan-600 hover:bg-cyan-50" data-testid="new-vacancy-btn">
              <Briefcase className="mr-2 h-4 w-4" />
              Nueva Vacante
            </Button>
          </Link>
          <Link to="/candidates?new=true">
            <Button variant="outline" data-testid="new-candidate-btn">
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Candidato
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid with Time to Hire */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover-card border-slate-200" data-testid={`stat-card-${index}`}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
        {/* Time to Hire Card */}
        <Card className="hover-card border-slate-200 bg-gradient-to-br from-amber-50 to-orange-50" data-testid="time-to-hire-card">
          <CardContent className="p-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-3">
              <Timer className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {timeToHire?.avg_time_to_hire_days || 0}
              <span className="text-sm font-normal text-slate-500 ml-1">días</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Time to Hire (Promedio)</p>
            {timeToHire?.total_hires_analyzed > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">{timeToHire.total_hires_analyzed} contrataciones</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Distribution */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Distribución del Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pipelineData.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  No hay candidatos en el pipeline
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Source Breakdown */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Fuentes de Reclutamiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="source"
                      label={({ source, count }) => `${source}: ${count}`}
                      labelLine={false}
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full text-center text-slate-400">
                  No hay datos de fuentes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Aplicaciones Recientes</CardTitle>
          <Link to="/pipeline">
            <Button variant="ghost" size="sm" className="text-cyan-600 hover:text-cyan-700">
              Ver Pipeline <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats?.recent_applications?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_applications.map((app, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  data-testid={`recent-app-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-slate-200 text-slate-600 text-sm">
                        {app.candidate_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900">{app.candidate_name}</p>
                      <p className="text-sm text-slate-500">{app.vacancy_title}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${stageMap[app.current_stage]?.color || 'bg-slate-100 text-slate-600'}`}>
                    {stageMap[app.current_stage]?.label || app.current_stage}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay aplicaciones recientes</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
