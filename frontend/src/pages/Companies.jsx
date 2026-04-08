import React, { useState, useEffect } from 'react';
import { apiRequest, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Building2, Globe, Phone, MapPin, FileText, Search } from 'lucide-react';

const initialForm = {
  name: '',
  short_name: '',
  rfc: '',
  address: '',
  phone: '',
  website: '',
  industry: '',
  is_active: true
};

export const Companies = () => {
  const { hasRole } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);

  const load = async () => {
    try {
      const data = await apiRequest('/companies');
      setCompanies(data);
    } catch {
      toast.error('Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name,
      short_name: c.short_name || '',
      rfc: c.rfc || '',
      address: c.address || '',
      phone: c.phone || '',
      website: c.website || '',
      industry: c.industry || '',
      is_active: c.is_active
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await apiRequest(`/companies/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
        toast.success('Empresa actualizada');
      } else {
        await apiRequest('/companies', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Empresa creada');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Error al guardar');
    }
  };

  const handleDeactivate = async (c) => {
    if (!window.confirm(`¿Desactivar la empresa "${c.name}"?`)) return;
    try {
      await apiRequest(`/companies/${c.id}`, { method: 'DELETE' });
      toast.success('Empresa desactivada');
      load();
    } catch {
      toast.error('Error al desactivar');
    }
  };

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.rfc && c.rfc.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6" data-testid="companies-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Empresas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestión del catálogo de empresas del grupo</p>
        </div>
        {hasRole(['admin']) && (
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={openCreate} data-testid="new-company-btn">
            <Plus size={16} className="mr-2" /> Nueva Empresa
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nombre o RFC..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          data-testid="company-search"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="py-16 text-center text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin empresas registradas</p>
            {hasRole(['admin']) && (
              <Button className="mt-4 bg-slate-900 hover:bg-slate-800" onClick={openCreate}>
                Agregar primera empresa
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="border-slate-200 hover:shadow-md transition-shadow" data-testid={`company-card-${c.id}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-cyan-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      {c.short_name && <p className="text-xs text-slate-400">{c.short_name}</p>}
                    </div>
                  </div>
                  <Badge className={c.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}>
                    {c.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  {c.rfc && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <FileText size={13} className="flex-shrink-0" />
                      <span>RFC: {c.rfc}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin size={13} className="flex-shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone size={13} className="flex-shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.website && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Globe size={13} className="flex-shrink-0" />
                      <a href={c.website} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline truncate">
                        {c.website}
                      </a>
                    </div>
                  )}
                  {c.industry && (
                    <p className="text-xs text-slate-400 pt-0.5">{c.industry}</p>
                  )}
                </div>

                <div className="text-xs text-slate-400 pt-1 border-t border-slate-100">
                  Creada {formatDate(c.created_at)}
                </div>

                {hasRole(['admin']) && (
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(c)} data-testid={`edit-company-${c.id}`}>
                      <Edit size={13} className="mr-1.5" /> Editar
                    </Button>
                    {c.is_active && (
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeactivate(c)} data-testid={`deactivate-company-${c.id}`}>
                        Desactivar
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Razón Social *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required data-testid="company-name-input" />
              </div>
              <div className="space-y-1.5">
                <Label>Nombre Corto</Label>
                <Input value={form.short_name} onChange={e => setForm({ ...form, short_name: e.target.value })} placeholder="Alias o siglas" data-testid="company-short-input" />
              </div>
              <div className="space-y-1.5">
                <Label>RFC</Label>
                <Input value={form.rfc} onChange={e => setForm({ ...form, rfc: e.target.value.toUpperCase() })} placeholder="RFC000000AAA" data-testid="company-rfc-input" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Dirección</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} data-testid="company-address-input" />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} data-testid="company-phone-input" />
              </div>
              <div className="space-y-1.5">
                <Label>Sitio Web</Label>
                <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://..." data-testid="company-website-input" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Industria / Giro</Label>
                <Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="Tecnología, Manufactura, Servicios..." data-testid="company-industry-input" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="save-company-btn">
                {editing ? 'Guardar Cambios' : 'Crear Empresa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
