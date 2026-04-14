import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Users,
  Mail,
  Building2,
  Edit,
  Trash2,
  MoreHorizontal,
  UserCheck
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export const HRPersonnel = () => {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  const initialFormState = {
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    department: '',
    is_active: true
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    loadPersonnel();
  }, [showActiveOnly]);

  const loadPersonnel = async () => {
    try {
      // Backend corregido usa include_inactive=true para mostrar todos
      const data = await apiRequest(`/hr-personnel?include_inactive=${!showActiveOnly}`);
      setPersonnel(data || []);
    } catch (error) {
      console.error('Error loading HR personnel:', error);
      toast.error('Error al cargar personal de RRHH');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPerson) {
        await apiRequest(`/hr-personnel/${editingPerson.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast.success('Entrevistador actualizado');
      } else {
        await apiRequest('/hr-personnel', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast.success('Entrevistador creado');
      }
      
      setShowForm(false);
      setEditingPerson(null);
      setFormData(initialFormState);
      loadPersonnel();
    } catch (error) {
      toast.error(error.message || 'Error al guardar');
    }
  };

  const handleEdit = (person) => {
    setEditingPerson(person);
    setFormData({
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email || '',
      position: person.position || '',
      department: person.department || '',
      is_active: person.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Desactivar este entrevistador?')) return;
    try {
      await apiRequest(`/hr-personnel/${id}`, { method: 'DELETE' });
      toast.success('Entrevistador desactivado');
      loadPersonnel();
    } catch (error) {
      toast.error('Error al desactivar');
    }
  };

  const filteredPersonnel = personnel.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
    (p.department && p.department.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6" data-testid="hr-personnel-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Personal RRHH</h1>
          <p className="text-slate-500 mt-1">Gestiona entrevistadores oficiales</p>
        </div>
        <Button 
          onClick={() => { setFormData(initialFormState); setEditingPerson(null); setShowForm(true); }}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="new-personnel-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Entrevistador
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, email o departamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600">Solo activos</Label>
              <Switch
                checked={showActiveOnly}
                onCheckedChange={setShowActiveOnly}
                data-testid="active-only-switch"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredPersonnel.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    No hay entrevistadores registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersonnel.map((person) => (
                  <TableRow key={person.id} className="hover:bg-slate-50" data-testid={`personnel-row-${person.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                          <UserCheck size={18} className="text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{person.first_name} {person.last_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {person.email ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={12} className="text-slate-400" />
                          {person.email}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {person.position || '-'}
                    </TableCell>
                    <TableCell>
                      {person.department ? (
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-slate-400" />
                          {person.department}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${person.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        {person.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`personnel-menu-${person.id}`}>
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(person)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {person.is_active && (
                            <DropdownMenuItem onClick={() => handleDelete(person.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Desactivar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPerson ? 'Editar Entrevistador' : 'Nuevo Entrevistador'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  data-testid="personnel-firstname-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido *</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  data-testid="personnel-lastname-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@empresa.com"
                data-testid="personnel-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Ej: Gerente de RRHH"
                data-testid="personnel-position-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Ej: Recursos Humanos"
                data-testid="personnel-department-input"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Estado Activo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                data-testid="personnel-active-switch"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="personnel-submit-btn">
                {editingPerson ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
