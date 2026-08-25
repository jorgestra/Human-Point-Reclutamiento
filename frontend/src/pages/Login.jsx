import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Briefcase } from 'lucide-react';

const LOGO_URL = null; // Logo gestionado inline
const BG_IMAGE = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2069";

export const Login = () => {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
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
          <div className="flex items-center gap-3" data-testid="login-logo">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #004aad, #38b6ff)' }}>
                <span className="text-white font-bold text-lg">HP</span>
              </div>
              <div className="leading-tight">
                <p className="text-white font-bold text-xl leading-none">Human Point</p>
                <p className="text-slate-300 text-sm">Reclutamiento</p>
              </div>
            </div>
          
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
          <div className="lg:hidden mb-8 flex flex-col items-center">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #004aad, #38b6ff)' }}>
              <span className="text-white font-bold text-xl">HP</span>
            </div>
            <p className="text-slate-900 font-bold text-xl">Human Point</p>
            <p className="text-slate-500 text-sm">Reclutamiento</p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold font-['Manrope'] text-center">
                Bienvenido
              </CardTitle>
              <CardDescription className="text-center">
                Accede a tu cuenta de Human Point ATS
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
