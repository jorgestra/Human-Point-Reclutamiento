import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Eye, EyeOff, Briefcase } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_recruit-pro-37/artifacts/nwd198i2_Logo%20HUMAN%20POINT.png";
const BG_IMAGE = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2069";

export const Login = () => {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'recruiter',
    department: ''
  });

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginData.email, loginData.password);
      toast.success('Bienvenido de vuelta');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(registerData);
      toast.success('Cuenta creada exitosamente');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-slate-900"
        style={{
          backgroundImage: `url(${BG_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-slate-900/70" />
        <div className="relative z-10 p-12 flex flex-col justify-between">
          <img src={LOGO_URL} alt="Human Point" className="h-12 w-auto object-contain" />
          
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold text-white font-['Manrope'] leading-tight">
              Sistema de Seguimiento de Candidatos
            </h1>
            <p className="text-xl text-slate-300 max-w-lg">
              Gestiona todo el ciclo de reclutamiento desde requisiciones hasta contrataciones, integrado con Human Point.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <Briefcase size={20} />
                <span className="text-sm font-medium">ATS Enterprise</span>
              </div>
            </div>
          </div>

          <p className="text-slate-400 text-sm">
            © 2024 Human Point. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <img src={LOGO_URL} alt="Human Point" className="h-10 mx-auto mb-4" />
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold font-['Manrope'] text-center">
                Bienvenido
              </CardTitle>
              <CardDescription className="text-center">
                Accede a tu cuenta o crea una nueva
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="login-tab">Iniciar Sesión</TabsTrigger>
                  <TabsTrigger value="register" data-testid="register-tab">Registrarse</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Correo Electrónico</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="correo@empresa.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        data-testid="login-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          required
                          data-testid="login-password-input"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-slate-900 hover:bg-slate-800"
                      disabled={loading}
                      data-testid="login-submit-button"
                    >
                      {loading ? 'Ingresando...' : 'Ingresar'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">Nombre</Label>
                        <Input
                          id="first_name"
                          placeholder="Juan"
                          value={registerData.first_name}
                          onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                          required
                          data-testid="register-firstname-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Apellido</Label>
                        <Input
                          id="last_name"
                          placeholder="Pérez"
                          value={registerData.last_name}
                          onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                          required
                          data-testid="register-lastname-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Correo Electrónico</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="correo@empresa.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                        data-testid="register-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Contraseña</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                        minLength={6}
                        data-testid="register-password-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Rol</Label>
                        <Select
                          value={registerData.role}
                          onValueChange={(value) => setRegisterData({ ...registerData, role: value })}
                        >
                          <SelectTrigger data-testid="register-role-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="recruiter">Reclutador</SelectItem>
                            <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                            <SelectItem value="viewer">Visor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Departamento</Label>
                        <Input
                          id="department"
                          placeholder="Ej: TI"
                          value={registerData.department}
                          onChange={(e) => setRegisterData({ ...registerData, department: e.target.value })}
                          data-testid="register-department-input"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-slate-900 hover:bg-slate-800"
                      disabled={loading}
                      data-testid="register-submit-button"
                    >
                      {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
