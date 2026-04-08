import React, { useState, useEffect } from 'react';
import { apiRequest, PIPELINE_STAGES } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Clock,
  TrendingUp,
  Users,
  Target,
  Briefcase
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
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16', '#f43f5e'];

export const Reports = () => {
  const [metrics, setMetrics] = useState(null);
  const [timeToHire, setTimeToHire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [filterEmpresa, setFilterEmpresa] = useState('all');

  useEffect(() => {
    loadCompanies();
    loadMetrics();
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [filterEmpresa]);

  const loadMetrics = async () => {
    try {
      const params = filterEmpresa !== 'all' ? `?empresa_id=${filterEmpresa}` : '';
      const [metricsData, timeData] = await Promise.all([
        apiRequest(`/reports/hiring-metrics${params}`),
        apiRequest(`/metrics/time-to-hire${params}`)
      ]);
      setMetrics(metricsData);
      setTimeToHire(timeData);
    } catch (error) {
      console.error('Error loading metrics:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ✅ Backend devuelve pipeline_stages (no conversion_rates)
  const pipelineData = (metrics?.pipeline_stages || []).map(item => ({
    stage: PIPELINE_STAGES[item.stage]?.label || item.stage,
    candidatos: item.count
  }));

  // ✅ Backend devuelve open_vacancies y closed_vacancies (no vacancies.open/closed)
  const vacancyData = [
    { name: 'Abiertas', value: metrics?.open_vacancies || 0, color: '#10b981' },
    { name: 'Cerradas', value: metrics?.closed_vacancies || 0, color: '#94a3b8' }
  ];

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Reportes y Métricas</h1>
          <p className="text-slate-500 mt-1">Análisis del proceso de reclutamiento</p>
        </div>
        {companies.length > 0 && (
          <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
            <SelectTrigger className="w-48" data-testid="reports-empresa-filter">
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Time to Hire Promedio</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {timeToHire?.avg_time_to_hire_days || 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">días</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="text-blue-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Aplicaciones</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {metrics?.total_applications || 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">candidatos</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="text-emerald-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Vacantes Abiertas</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {metrics?.open_vacancies || 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">posiciones</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center">
                <Briefcase className="text-cyan-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Vacantes Cerradas</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {metrics?.closed_vacancies || 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">posiciones</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <Target className="text-slate-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Candidatos por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {pipelineData.some(d => d.candidatos > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData} margin={{ left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: 10 }}
                      angle={-40}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [value, 'Candidatos']}
                    />
                    <Bar dataKey="candidatos" radius={[4, 4, 0, 0]}>
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No hay candidatos en el pipeline
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vacancies Distribution */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Vacantes: Abiertas vs Cerradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              {vacancyData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vacancyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {vacancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400">Sin datos de vacantes</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time to Hire por empresa */}
      {timeToHire?.by_empresa?.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Time to Hire por Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Empresa</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Promedio (días)</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Contrataciones</th>
                  </tr>
                </thead>
                <tbody>
                  {timeToHire.by_empresa.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-700">{row.empresa_id || 'Sin empresa'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">{row.avg_days}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{row.total_hires}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
