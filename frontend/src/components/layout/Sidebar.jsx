import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  Kanban,
  Calendar,
  FileCheck,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Menu
} from 'lucide-react';
import { cn } from '../../lib/utils';

const LOGO_URL = null; // Logo gestionado inline

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'recruiter', 'hiring_manager', 'viewer'] },
  { icon: Kanban, label: 'Pipeline', path: '/pipeline', roles: ['admin', 'recruiter', 'hiring_manager', 'viewer'] },
  { icon: FileText, label: 'Requisiciones', path: '/requisitions', roles: ['admin', 'recruiter', 'hiring_manager'] },
  { icon: Briefcase, label: 'Vacantes', path: '/vacancies', roles: ['admin', 'recruiter', 'hiring_manager', 'viewer'] },
  { icon: Users, label: 'Candidatos', path: '/candidates', roles: ['admin', 'recruiter', 'hiring_manager', 'viewer'] },
  { icon: Calendar, label: 'Entrevistas', path: '/interviews', roles: ['admin', 'recruiter', 'hiring_manager'] },
  { icon: FileCheck, label: 'Ofertas', path: '/offers', roles: ['admin', 'recruiter'] },
  { icon: UserCheck, label: 'Contrataciones', path: '/hirings', roles: ['admin', 'recruiter'] },
  { icon: BarChart3, label: 'Reportes', path: '/reports', roles: ['admin', 'recruiter', 'hiring_manager'] },
];

export const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(item => hasRole(item.roles));

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setCollapsed(true)}
          data-testid="sidebar-overlay"
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-slate-900 text-white z-50 transition-all duration-300 flex flex-col",
          collapsed ? "-translate-x-full lg:translate-x-0 lg:w-20" : "translate-x-0 w-64"
        )}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {!collapsed && (
            <div className="flex items-center gap-2" data-testid="sidebar-logo">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #004aad, #38b6ff)' }}>
                <span className="text-white font-bold text-sm">HP</span>
              </div>
              <div className="leading-tight">
                <p className="text-white font-bold text-sm leading-none">Human Point</p>
                <p className="text-slate-400 text-xs">Reclutamiento</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors lg:block hidden"
            data-testid="sidebar-toggle"
          >
            {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {filteredNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-cyan-500/20 text-cyan-400 border-l-2 border-cyan-400"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    )
                  }
                  data-testid={`nav-${item.path.replace('/', '')}`}
                >
                  <item.icon size={20} strokeWidth={1.5} />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-slate-800 p-4">
          {!collapsed && user && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-white truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          )}
          <div className="flex gap-2">
            {!collapsed && (
              <NavLink
                to="/settings"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                data-testid="nav-settings"
              >
                <Settings size={18} />
                <span className="text-sm">Ajustes</span>
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors",
                collapsed ? "flex-1" : ""
              )}
              data-testid="logout-button"
            >
              <LogOut size={18} />
              {!collapsed && <span className="text-sm">Salir</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
