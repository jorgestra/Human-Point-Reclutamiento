import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const BG_IMAGE = "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=2070";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://human-point-reclutamiento-production.up.railway.app';

export const Login = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [clientLogo, setClientLogo] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/tenant/public-config?tenant_id=default`)
      .then(r => r.json())
      .then(d => { if (d.logo_url) setClientLogo(`${BACKEND_URL}${d.logo_url}`); })
      .catch(() => {});
  }, []);

  if (user) return <Navigate to="/dashboard" replace />;

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

  return (
    <div className="min-h-screen flex" data-testid="login-page">

      {/* Panel izquierdo */}
      <div
        className="hidden lg:flex lg:w-1/2 relative bg-slate-900 flex-col"
        style={{ backgroundImage: `url(${BG_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(3,9,64,0.88) 0%, rgba(0,74,173,0.70) 60%, rgba(56,182,255,0.35) 100%)' }} />

        {/* Logo — primero en el DOM, pegado arriba */}
        <div className="relative z-10 p-6 pb-0" data-testid="login-logo">
          <img
            src="/human-point-logo.svg"
            alt="Human Point"
            style={{ width: '60%', maxWidth: 300, height: 'auto', display: 'block' }}
          />
        </div>

        {/* Tagline — crece para llenar el espacio y queda abajo */}
        <div className="relative z-10 p-6 pt-0 flex flex-col justify-end" style={{paddingBottom: "10%"}}>
          <div className="space-y-1">
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Human Point —
            </h1>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Sistema de reclutamiento
            </h1>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight" style={{ color: '#38b6ff' }}>
              y selección
            </h1>
            <p className="text-slate-400 text-sm pt-4">
              © 2026 Human Point · ITligencia. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="lg:hidden mb-8 flex flex-col items-center">
            <img src="/human-point-logo.svg" alt="Human Point" style={{ width: 180, height: 'auto', marginBottom: 8 }} />
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-3 pb-4">
              {clientLogo && (
                <div className="flex justify-center pt-2">
                  <img
                    src={clientLogo}
                    alt="Cliente"
                    style={{ height: 52, maxWidth: 180, objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              <CardTitle className="text-2xl font-bold text-center">Bienvenido</CardTitle>
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
                  className="w-full"
                  style={{ background: 'linear-gradient(135deg, #030940, #004aad)' }}
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
