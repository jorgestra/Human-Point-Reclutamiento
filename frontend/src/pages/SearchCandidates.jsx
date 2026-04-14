import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, formatCurrency, formatDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { 
  Search, 
  Filter,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  RefreshCw,
  User,
  Briefcase
} from 'lucide-react';

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

export default function SearchCandidates() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Filter states
  const [filters, setFilters] = useState({
    name: searchParams.get('q') || '',
    candidate_status: '__all__',
    experience_range: '__all__',
    professional_level_id: '__all__',
    professional_area_id: '__all__',
    language_id: '__all__',
    empresa_id: '__all__',
    min_salary: '',
    max_salary: '',
    position_applied: ''
  });
  
  // Data states
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Catalog data
  const [companies, setCompanies] = useState([]);
  const [professionalLevels, setProfessionalLevels] = useState([]);
  const [professionalAreas, setProfessionalAreas] = useState([]);
  const [languages, setLanguages] = useState([]);
  
  const limit = 15;

  // Si viene ?q= desde el Topbar, ejecutar búsqueda automáticamente
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim()) {
      searchCandidates();
    }
  }, []);

  // Load catalogs
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [comps, levels, areas, langs] = await Promise.all([
          apiRequest('/companies'),
          apiRequest('/catalogs/professional-levels'),
          apiRequest('/catalogs/professional-areas'),
          apiRequest('/catalogs/languages')
        ]);
        setCompanies(comps || []);
        setProfessionalLevels(levels || []);
        setProfessionalAreas(areas || []);
        setLanguages(langs || []);
      } catch (error) {
        console.error('Error loading catalogs:', error);
      }
    };
    loadCatalogs();
  }, []);

  // Search function
  const searchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('sort_by', sortBy);
      params.append('sort_dir', sortOrder.toUpperCase());

      // Mapeo correcto de filtros frontend → backend
      if (filters.name && filters.name.trim()) params.append('q', filters.name.trim());
      if (filters.candidate_status && filters.candidate_status !== '__all__') params.append('candidate_status', filters.candidate_status);
      if (filters.experience_range && filters.experience_range !== '__all__') params.append('experience_range', filters.experience_range);
      if (filters.professional_level_id && filters.professional_level_id !== '__all__') params.append('professional_level_id', filters.professional_level_id);
      if (filters.professional_area_id && filters.professional_area_id !== '__all__') params.append('professional_area_ids', filters.professional_area_id);
      if (filters.language_id && filters.language_id !== '__all__') params.append('language_ids', filters.language_id);
      if (filters.min_salary && filters.min_salary.trim()) params.append('salary_min', filters.min_salary.trim());
      if (filters.max_salary && filters.max_salary.trim()) params.append('salary_max', filters.max_salary.trim());

      const data = await apiRequest(`/candidates/search/advanced?${params.toString()}`);
      setResults(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Error al buscar candidatos');
    } finally {
      setLoading(false);
    }
  }, [filters, page, sortBy, sortOrder]);

  // Handle search submit
  const handleSearch = (e) => {
    e?.preventDefault();
    setPage(1);
    searchCandidates();
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Re-search when sort or page changes (only if already searched)
  useEffect(() => {
    if (results.length > 0 || total > 0) {
      searchCandidates();
    }
  }, [sortBy, sortOrder, page, searchCandidates]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      name: '',
      candidate_status: '__all__',
      experience_range: '__all__',
      professional_level_id: '__all__',
      professional_area_id: '__all__',
      language_id: '__all__',
      empresa_id: '__all__',
      min_salary: '',
      max_salary: '',
      position_applied: ''
    });
    setResults([]);
    setTotal(0);
    setPage(1);
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(v => v && v.toString().trim() && v !== '__all__').length;

  // Render sort icon
  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const getStatusBadge = (status) => {
    const colors = {
      available: 'bg-green-50 text-green-700',
      disqualified: 'bg-red-50 text-red-700',
      talent_pool: 'bg-blue-50 text-blue-700',
      no_response: 'bg-amber-50 text-amber-700',
      rejected_offer: 'bg-purple-50 text-purple-700'
    };
    const label = CANDIDATE_STATUS_OPTIONS.find(s => s.value === status)?.label || status;
    return <Badge className={colors[status] || 'bg-slate-100'}>{label}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="search-candidates-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope'] flex items-center gap-2">
          <Search size={24} className="text-slate-600" />
          Buscar Candidatos
        </h1>
        <p className="text-slate-500 mt-1">Búsqueda avanzada con filtros combinables</p>
      </div>

      {/* Filters Card */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter size={18} />
              Filtros de Búsqueda
              {activeFilterCount > 0 && (
                <Badge variant="secondary">{activeFilterCount} activos</Badge>
              )}
            </CardTitle>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                <X size={14} className="mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Nombre</Label>
                <Input
                  placeholder="Buscar por nombre..."
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  data-testid="filter-name"
                />
              </div>

              {/* Estatus */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Estatus del Candidato</Label>
                <Select value={filters.candidate_status} onValueChange={(v) => setFilters({ ...filters, candidate_status: v })}>
                  <SelectTrigger data-testid="filter-status">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {CANDIDATE_STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rango de Experiencia */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Rango de Experiencia</Label>
                <Select value={filters.experience_range} onValueChange={(v) => setFilters({ ...filters, experience_range: v })}>
                  <SelectTrigger data-testid="filter-experience">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {EXPERIENCE_RANGE_OPTIONS.map(e => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nivel Profesional */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Nivel Profesional</Label>
                <Select value={filters.professional_level_id} onValueChange={(v) => setFilters({ ...filters, professional_level_id: v })}>
                  <SelectTrigger data-testid="filter-level">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {professionalLevels.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Área Profesional */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Área Profesional</Label>
                <Select value={filters.professional_area_id} onValueChange={(v) => setFilters({ ...filters, professional_area_id: v })}>
                  <SelectTrigger data-testid="filter-area">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {professionalAreas.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Idioma */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Idioma</Label>
                <Select value={filters.language_id} onValueChange={(v) => setFilters({ ...filters, language_id: v })}>
                  <SelectTrigger data-testid="filter-language">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {languages.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Empresa */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Empresa (Aplicaciones)</Label>
                <Select value={filters.empresa_id} onValueChange={(v) => setFilters({ ...filters, empresa_id: v })}>
                  <SelectTrigger data-testid="filter-company">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Posición Aplicada */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Posición Aplicada</Label>
                <Input
                  placeholder="Ej: Desarrollador..."
                  value={filters.position_applied}
                  onChange={(e) => setFilters({ ...filters, position_applied: e.target.value })}
                  data-testid="filter-position"
                />
              </div>

              {/* Salario Mínimo */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Salario Mínimo</Label>
                <Input
                  type="number"
                  placeholder="Mínimo..."
                  value={filters.min_salary}
                  onChange={(e) => setFilters({ ...filters, min_salary: e.target.value })}
                  data-testid="filter-min-salary"
                />
              </div>

              {/* Salario Máximo */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Salario Máximo</Label>
                <Input
                  type="number"
                  placeholder="Máximo..."
                  value={filters.max_salary}
                  onChange={(e) => setFilters({ ...filters, max_salary: e.target.value })}
                  data-testid="filter-max-salary"
                />
              </div>
            </div>

            {/* Search Button */}
            <div className="flex justify-end mt-6 gap-2">
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" disabled={loading} data-testid="search-btn">
                {loading ? (
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                ) : (
                  <Search size={16} className="mr-2" />
                )}
                Buscar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Resultados
              {total > 0 && <span className="text-slate-400 font-normal ml-2">({total} encontrados)</span>}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => handleSort('first_name')}
                >
                  <div className="flex items-center gap-1">
                    Candidato
                    <SortIcon field="first_name" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => handleSort('candidate_status')}
                >
                  <div className="flex items-center gap-1">
                    Estatus
                    <SortIcon field="candidate_status" />
                  </div>
                </TableHead>
                <TableHead>Experiencia</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Áreas</TableHead>
                <TableHead>Idiomas</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => handleSort('expected_salary')}
                >
                  <div className="flex items-center gap-1">
                    Expectativa
                    <SortIcon field="expected_salary" />
                  </div>
                </TableHead>
                <TableHead>Última Posición</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                    {total === 0 && activeFilterCount === 0 
                      ? 'Usa los filtros y presiona "Buscar" para encontrar candidatos'
                      : 'No se encontraron candidatos con los filtros seleccionados'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                results.map((candidate) => (
                  <TableRow 
                    key={candidate.id} 
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                    data-testid={`result-row-${candidate.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <User size={14} className="text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {candidate.first_name} {candidate.last_name}
                          </p>
                          <p className="text-xs text-slate-400">{candidate.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(candidate.candidate_status)}
                    </TableCell>
                    <TableCell>
                      {candidate.experience_range ? (
                        <Badge variant="outline">{candidate.experience_range} años</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {candidate.professional_level_name || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600 max-w-[150px] truncate block" title={candidate.professional_areas_text}>
                        {candidate.professional_areas_text || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600 max-w-[120px] truncate block" title={candidate.languages_text}>
                        {candidate.languages_text || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {candidate.expected_salary ? formatCurrency(candidate.expected_salary) : '-'}
                    </TableCell>
                    <TableCell>
                      {candidate.last_position_applied ? (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Briefcase size={12} />
                          <span className="max-w-[120px] truncate">{candidate.last_position_applied}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => navigate(`/candidates/${candidate.id}`)}
                        data-testid={`view-${candidate.id}`}
                      >
                        <Eye size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-slate-500">
                Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page * limit >= total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
