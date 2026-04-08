import React from 'react';
import { useAuth } from '../../context/AuthContext';
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
import { USER_ROLES } from '../../lib/utils';

export const Topbar = ({ onMenuClick, title }) => {
  const { user, logout } = useAuth();

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const roleInfo = user?.role ? USER_ROLES[user.role] : null;

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
          <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-slate-400"
              data-testid="search-input"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" data-testid="notifications-button">
            <Bell size={20} className="text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full" />
          </Button>

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
