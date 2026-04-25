import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, User } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { USER_ROLES, apiRequest, formatDateTime } from '../../lib/utils';

export const Topbar = ({ onMenuClick, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [todayInterviews, setTodayInterviews] = useState([]);
  const [showBell, setShowBell] = useState(false);

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const roleInfo = user?.role ? USER_ROLES[user.role] : null;

  useEffect(() => {
    const loadTodayInterviews = async () => {
      try {
        const data = await apiRequest('/interviews/today');
        setTodayInterviews(data || []);
      } catch {}
    };
    loadTodayInterviews();
    // Recargar cada 5 minutos
    const interval = setInterval(loadTodayInterviews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search-candidates?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header 
      className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 lg:px-6"
      data-testid="topbar"
    >
      <div className="h-full flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            data-testid="mobile-menu-button"
          >
            <Menu size={20} />
          </Button>
          
          {title && (
            <h1 className="text-xl font-semibold text-slate-900 font-['Manrope']" data-testid="page-title">
              {title}
            </h1>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search (desktop only) */}
          <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 focus-within:bg-slate-200 transition-colors">
            <Search size={16} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar candidatos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-slate-400"
              data-testid="search-input"
            />
          </div>

          {/* Entrevistas del día */}
          <DropdownMenu open={showBell} onOpenChange={setShowBell}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" data-testid="notifications-button">
                <Bell size={20} className="text-slate-600" />
                {todayInterviews.length > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-cyan-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {todayInterviews.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Bell size={14} className="text-cyan-500" />
                Entrevistas de Hoy
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {todayInterviews.length === 0 ? (
                <div className="py-4 text-center text-sm text-slate-400">
                  Sin entrevistas programadas para hoy
                </div>
              ) : (
                todayInterviews.map(interview => (
                  <DropdownMenuItem
                    key={interview.id}
                    className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
                    onClick={() => { setShowBell(false); }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm text-slate-900">{interview.candidate_name || 'Candidato'}</span>
                      <span className="text-xs text-cyan-600 font-medium">
                        {interview.scheduled_at ? new Date(interview.scheduled_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 truncate w-full">{interview.vacancy_title || ''}</span>
                    {interview.location && (
                      <span className="text-xs text-slate-400">{interview.location}</span>
                    )}
                  </DropdownMenuItem>
                ))
              )}
              {todayInterviews.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-cyan-600 text-sm justify-center font-medium"
                    onClick={() => { setShowBell(false); window.location.href = '/interviews'; }}
                  >
                    Ver todas las entrevistas
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 px-2"
                data-testid="user-menu-trigger"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-slate-900 text-white text-xs">
                    {getInitials(user?.first_name, user?.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  {roleInfo && (
                    <p className="text-xs text-slate-500">{roleInfo.label}</p>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="menu-profile">
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={logout}
                className="text-red-600"
                data-testid="menu-logout"
              >
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
