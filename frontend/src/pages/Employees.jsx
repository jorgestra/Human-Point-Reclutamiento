import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, formatCurrency, formatDate } from '../lib/utils';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { 
  User,
  Mail,
  Building2,
  Briefcase,
  DollarSign,
  Calendar,
  Search,
  ArrowUpDown,
  Eye
} from 'lucide-react';

export const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [position, setPosition] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadEmployees();
    loadCompanies();
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [search, employeeNumber, position, empresaFilter, sortBy, sortOrder]);

  const loadEmployees = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (employeeNumber) params.append('employee_number', employeeNumber);
      if (position) params.append('position', position);
      if (empresaFilter !== 'all') params.append('empresa_id', empresaFilter);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      
      const data = await apiRequest(`/employees?${params.toString()}`);
      setEmployees(data.items || []);
    } catch (error) {
      console.error('Error loading employees:', error);
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const SortHeader = ({ field, children }) => (
    <TableHead 
      className="cursor-pointer hover:bg-slate-50 select-none" 
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown size={12} className={sortBy === field ? 'text-cyan-600' : 'text-slate-300'} />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6" data-testid="employees-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Empleados</h1>
        <p className="text-slate-500 mt-1">Empleados contratados desde el ATS</p>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="employee-search"
                />
              </div>
            </div>
            <Input
              placeholder="No. Empleado"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              className="w-36"
              data-testid="employee-number-filter"
            />
            <Input
              placeholder="Posición"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-40"
              data-testid="employee-position-filter"
            />
            {companies.length > 0 && (
              <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
                <SelectTrigger className="w-48" data-testid="employee-empresa-filter">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las empresas</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="first_name">Empleado</SortHeader>
                <SortHeader field="employee_number">No. Empleado</SortHeader>
                <SortHeader field="department">Departamento</SortHeader>
                <SortHeader field="position">Posición</SortHeader>
                <SortHeader field="salary">Salario</SortHeader>
                <SortHeader field="start_date">Fecha Ingreso</SortHeader>
                <TableHead>Empresa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                    No hay empleados registrados
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-slate-50" data-testid={`employee-row-${emp.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-slate-100 text-slate-600">
                            {getInitials(emp.first_name, emp.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-900">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail size={10} />
                            {emp.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {emp.employee_number}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-slate-400" />
                        {emp.department}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-slate-400" />
                        {emp.position}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} className="text-emerald-500" />
                        {formatCurrency(emp.salary)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar size={14} />
                        {formatDate(emp.start_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{emp.empresa_name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={emp.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}>
                        {emp.status === 'active' ? 'Activo' : emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {emp.candidate_id && (
                        <Link to={`/candidates/${emp.candidate_id}`}>
                          <Button variant="ghost" size="icon" title="Ver perfil de candidato" data-testid={`view-candidate-${emp.id}`}>
                            <Eye size={16} className="text-slate-500" />
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
