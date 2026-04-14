import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Building2,
  Users,
  GraduationCap,
  Briefcase,
  Languages,
  Settings as SettingsIcon,
  Check,
  X
} from 'lucide-react';

// Generic Catalog Manager Component
const CatalogManager = ({ 
  title, 
  items, 
  loading, 
  onAdd, 
  onEdit, 
  onDelete, 
  columns,
  renderForm,
  icon: Icon
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({});
    setShowDialog(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        await onEdit(editingItem.id, formData);
        toast.success('Registro actualizado');
      } else {
        await onAdd(formData);
        toast.success('Registro creado');
      }
      setShowDialog(false);
      setFormData({});
    } catch (error) {
      toast.error(error.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      await onDelete(id);
      toast.success('Registro eliminado');
    } catch (error) {
      toast.error(error.message || 'Error al eliminar');
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          {Icon && <Icon size={20} className="text-slate-500" />}
          {title}
        </CardTitle>
        <Button size="sm" onClick={handleAdd} className="bg-slate-900 hover:bg-slate-800" data-testid={`add-${title.toLowerCase().replace(/\s/g, '-')}-btn`}>
          <Plus size={14} className="mr-1.5" />
          Agregar
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Sin registros</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} data-testid={`catalog-row-${item.id}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(item[col.key], item) : item[col.key]}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)} data-testid={`edit-${item.id}`}>
                        <Edit size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)} data-testid={`delete-${item.id}`}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar' : 'Agregar'} {title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {renderForm(formData, setFormData)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800" data-testid="save-catalog-btn">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('companies');
  
  // Data states
  const [companies, setCompanies] = useState([]);
  const [hrPersonnel, setHrPersonnel] = useState([]);
  const [professionalLevels, setProfessionalLevels] = useState([]);
  const [professionalAreas, setProfessionalAreas] = useState([]);
  const [languages, setLanguages] = useState([]);
  
  // Loading states
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingHR, setLoadingHR] = useState(true);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingLanguages, setLoadingLanguages] = useState(true);

  // Load data functions
  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const data = await apiRequest('/companies');
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Error al cargar empresas');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadHRPersonnel = async () => {
    try {
      setLoadingHR(true);
      const data = await apiRequest('/hr-personnel?include_inactive=true');
      setHrPersonnel(data || []);
    } catch (error) {
      console.error('Error loading HR personnel:', error);
      toast.error('Error al cargar personal RRHH');
    } finally {
      setLoadingHR(false);
    }
  };

  const loadProfessionalLevels = async () => {
    try {
      setLoadingLevels(true);
      const data = await apiRequest('/catalogs/professional-levels');
      setProfessionalLevels(data || []);
    } catch (error) {
      console.error('Error loading levels:', error);
      toast.error('Error al cargar niveles');
    } finally {
      setLoadingLevels(false);
    }
  };

  const loadProfessionalAreas = async () => {
    try {
      setLoadingAreas(true);
      const data = await apiRequest('/catalogs/professional-areas');
      setProfessionalAreas(data || []);
    } catch (error) {
      console.error('Error loading areas:', error);
      toast.error('Error al cargar áreas');
    } finally {
      setLoadingAreas(false);
    }
  };

  const loadLanguages = async () => {
    try {
      setLoadingLanguages(true);
      const data = await apiRequest('/catalogs/languages');
      setLanguages(data || []);
    } catch (error) {
      console.error('Error loading languages:', error);
      toast.error('Error al cargar idiomas');
    } finally {
      setLoadingLanguages(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadHRPersonnel();
    loadProfessionalLevels();
    loadProfessionalAreas();
    loadLanguages();
  }, []);

  // CRUD handlers for Companies
  const handleAddCompany = async (data) => {
    await apiRequest('/companies', { method: 'POST', body: JSON.stringify(data) });
    loadCompanies();
  };
  const handleEditCompany = async (id, data) => {
    await apiRequest(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    loadCompanies();
  };
  const handleDeleteCompany = async (id) => {
    await apiRequest(`/companies/${id}`, { method: 'DELETE' });
    loadCompanies();
  };

  // CRUD handlers for HR Personnel
  const handleAddHR = async (data) => {
    await apiRequest('/hr-personnel', { method: 'POST', body: JSON.stringify(data) });
    loadHRPersonnel();
  };
  const handleEditHR = async (id, data) => {
    await apiRequest(`/hr-personnel/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    loadHRPersonnel();
  };
  const handleDeleteHR = async (id) => {
    await apiRequest(`/hr-personnel/${id}`, { method: 'DELETE' });
    loadHRPersonnel();
  };

  // CRUD handlers for Professional Levels
  const handleAddLevel = async (data) => {
    await apiRequest('/catalogs/professional-levels', { method: 'POST', body: JSON.stringify(data) });
    loadProfessionalLevels();
  };
  const handleEditLevel = async (id, data) => {
    await apiRequest(`/catalogs/professional-levels/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    loadProfessionalLevels();
  };
  const handleDeleteLevel = async (id) => {
    await apiRequest(`/catalogs/professional-levels/${id}`, { method: 'DELETE' });
    loadProfessionalLevels();
  };

  // CRUD handlers for Professional Areas
  const handleAddArea = async (data) => {
    await apiRequest('/catalogs/professional-areas', { method: 'POST', body: JSON.stringify(data) });
    loadProfessionalAreas();
  };
  const handleEditArea = async (id, data) => {
    await apiRequest(`/catalogs/professional-areas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    loadProfessionalAreas();
  };
  const handleDeleteArea = async (id) => {
    await apiRequest(`/catalogs/professional-areas/${id}`, { method: 'DELETE' });
    loadProfessionalAreas();
  };

  // CRUD handlers for Languages
  const handleAddLanguage = async (data) => {
    await apiRequest('/catalogs/languages', { method: 'POST', body: JSON.stringify(data) });
    loadLanguages();
  };
  const handleEditLanguage = async (id, data) => {
    await apiRequest(`/catalogs/languages/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    loadLanguages();
  };
  const handleDeleteLanguage = async (id) => {
    await apiRequest(`/catalogs/languages/${id}`, { method: 'DELETE' });
    loadLanguages();
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope'] flex items-center gap-2">
          <SettingsIcon size={24} className="text-slate-600" />
          Configuración
        </h1>
        <p className="text-slate-500 mt-1">Administra catálogos y configuraciones del sistema</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="companies" className="flex items-center gap-1.5" data-testid="tab-companies">
            <Building2 size={14} />
            <span className="hidden sm:inline">Empresas</span>
          </TabsTrigger>
          <TabsTrigger value="hr" className="flex items-center gap-1.5" data-testid="tab-hr">
            <Users size={14} />
            <span className="hidden sm:inline">Personal RRHH</span>
          </TabsTrigger>
          <TabsTrigger value="levels" className="flex items-center gap-1.5" data-testid="tab-levels">
            <GraduationCap size={14} />
            <span className="hidden sm:inline">Niveles</span>
          </TabsTrigger>
          <TabsTrigger value="areas" className="flex items-center gap-1.5" data-testid="tab-areas">
            <Briefcase size={14} />
            <span className="hidden sm:inline">Áreas</span>
          </TabsTrigger>
          <TabsTrigger value="languages" className="flex items-center gap-1.5" data-testid="tab-languages">
            <Languages size={14} />
            <span className="hidden sm:inline">Idiomas</span>
          </TabsTrigger>
        </TabsList>

        {/* Companies Tab */}
        <TabsContent value="companies" className="mt-6">
          <CatalogManager
            title="Empresas"
            icon={Building2}
            items={companies}
            loading={loadingCompanies}
            onAdd={handleAddCompany}
            onEdit={handleEditCompany}
            onDelete={handleDeleteCompany}
            columns={[
              { key: 'name', label: 'Nombre' },
              { key: 'identifier', label: 'Identificador' },
              { key: 'industry', label: 'Industria' },
              { key: 'is_active', label: 'Estado', render: (val) => (
                <Badge className={val ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}>
                  {val ? 'Activa' : 'Inactiva'}
                </Badge>
              )}
            ]}
            renderForm={(formData, setFormData) => (
              <>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nombre de la empresa"
                    data-testid="company-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Identificador *</Label>
                  <Input
                    value={formData.identifier || ''}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                    placeholder="NIT, RFC, etc."
                    data-testid="company-identifier-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industria</Label>
                  <Input
                    value={formData.industry || ''}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="Tecnología, Finanzas, etc."
                    data-testid="company-industry-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Dirección"
                    data-testid="company-address-input"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                    id="company-active"
                  />
                  <Label htmlFor="company-active">Activa</Label>
                </div>
              </>
            )}
          />
        </TabsContent>

        {/* HR Personnel Tab */}
        <TabsContent value="hr" className="mt-6">
          <CatalogManager
            title="Personal RRHH"
            icon={Users}
            items={hrPersonnel}
            loading={loadingHR}
            onAdd={handleAddHR}
            onEdit={handleEditHR}
            onDelete={handleDeleteHR}
            columns={[
              { key: 'name', label: 'Nombre' },
              { key: 'email', label: 'Email' },
              { key: 'position', label: 'Cargo' },
              { key: 'department', label: 'Departamento' },
              { key: 'is_active', label: 'Estado', render: (val) => (
                <Badge className={val ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}>
                  {val ? 'Activo' : 'Inactivo'}
                </Badge>
              )}
            ]}
            renderForm={(formData, setFormData) => (
              <>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nombre completo"
                    data-testid="hr-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@empresa.com"
                    data-testid="hr-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={formData.position || ''}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Gerente RRHH, Reclutador, etc."
                    data-testid="hr-position-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Input
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Recursos Humanos"
                    data-testid="hr-department-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+502 1234-5678"
                    data-testid="hr-phone-input"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                    id="hr-active"
                  />
                  <Label htmlFor="hr-active">Activo</Label>
                </div>
              </>
            )}
          />
        </TabsContent>

        {/* Professional Levels Tab */}
        <TabsContent value="levels" className="mt-6">
          <CatalogManager
            title="Niveles Profesionales"
            icon={GraduationCap}
            items={professionalLevels}
            loading={loadingLevels}
            onAdd={handleAddLevel}
            onEdit={handleEditLevel}
            onDelete={handleDeleteLevel}
            columns={[
              { key: 'name', label: 'Nombre' },
              { key: 'description', label: 'Descripción' },
              { key: 'order', label: 'Orden', render: (val) => (
                <Badge variant="outline">{val || 0}</Badge>
              )}
            ]}
            renderForm={(formData, setFormData) => (
              <>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Junior, Semi-Senior, Senior, etc."
                    data-testid="level-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del nivel"
                    data-testid="level-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    value={formData.order || 0}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    data-testid="level-order-input"
                  />
                </div>
              </>
            )}
          />
        </TabsContent>

        {/* Professional Areas Tab */}
        <TabsContent value="areas" className="mt-6">
          <CatalogManager
            title="Áreas Profesionales"
            icon={Briefcase}
            items={professionalAreas}
            loading={loadingAreas}
            onAdd={handleAddArea}
            onEdit={handleEditArea}
            onDelete={handleDeleteArea}
            columns={[
              { key: 'name', label: 'Nombre' },
              { key: 'description', label: 'Descripción' }
            ]}
            renderForm={(formData, setFormData) => (
              <>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Finanzas, Marketing, IT, etc."
                    data-testid="area-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del área"
                    data-testid="area-description-input"
                  />
                </div>
              </>
            )}
          />
        </TabsContent>

        {/* Languages Tab */}
        <TabsContent value="languages" className="mt-6">
          <CatalogManager
            title="Idiomas"
            icon={Languages}
            items={languages}
            loading={loadingLanguages}
            onAdd={handleAddLanguage}
            onEdit={handleEditLanguage}
            onDelete={handleDeleteLanguage}
            columns={[
              { key: 'name', label: 'Nombre' },
              { key: 'code', label: 'Código', render: (val) => (
                val ? <Badge variant="outline">{val}</Badge> : '-'
              )}
            ]}
            renderForm={(formData, setFormData) => (
              <>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Inglés, Francés, Alemán, etc."
                    data-testid="language-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código ISO</Label>
                  <Input
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="en, es, fr, de, etc."
                    maxLength={5}
                    data-testid="language-code-input"
                  />
                </div>
              </>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
