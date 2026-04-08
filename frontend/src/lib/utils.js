import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Auth helpers
export const getToken = () => localStorage.getItem('ats_token');
export const setToken = (token) => localStorage.setItem('ats_token', token);
export const removeToken = () => localStorage.removeItem('ats_token');
export const getUser = () => {
  const user = localStorage.getItem('ats_user');
  return user ? JSON.parse(user) : null;
};
export const setUser = (user) => localStorage.setItem('ats_user', JSON.stringify(user));
export const removeUser = () => localStorage.removeItem('ats_user');

// API helper with auth
export const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (response.status === 401) {
    removeToken();
    removeUser();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  
  return response.json();
};

// Format helpers
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatCurrency = (amount, currency = 'GTQ') => {
  if (amount === null || amount === undefined) return '-';
  const configs = {
    GTQ: { locale: 'es-GT', currency: 'GTQ' },
    USD: { locale: 'en-US', currency: 'USD' },
    MXN: { locale: 'es-MX', currency: 'MXN' }
  };
  const config = configs[currency] || configs.GTQ;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency
  }).format(amount);
};

export const formatSalaryRange = (min, max, currency = 'GTQ') => {
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
};

export const CURRENCIES = [
  { code: 'GTQ', name: 'Quetzal Guatemalteco', symbol: 'Q' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$' }
];

// Pipeline stage labels and colors
export const PIPELINE_STAGES = {
  applied: { label: 'Aplicado', color: 'bg-blue-50 text-blue-700', bgColor: '#dbeafe' },
  pre_filter: { label: 'Pre-filtro', color: 'bg-indigo-50 text-indigo-700', bgColor: '#e0e7ff' },
  interview_hr: { label: 'Entrevista RH', color: 'bg-pink-50 text-pink-700', bgColor: '#fce7f3' },
  interview_tech: { label: 'Entrevista Técnica', color: 'bg-purple-50 text-purple-700', bgColor: '#f3e8ff' },
  tests: { label: 'Pruebas', color: 'bg-yellow-50 text-yellow-700', bgColor: '#fef3c7' },
  finalist: { label: 'Finalista', color: 'bg-orange-50 text-orange-700', bgColor: '#fed7aa' },
  offer: { label: 'Oferta', color: 'bg-emerald-50 text-emerald-700', bgColor: '#d1fae5' },
  hired: { label: 'Contratado', color: 'bg-green-100 text-green-800', bgColor: '#a7f3d0' },
  rejected: { label: 'Rechazado', color: 'bg-red-50 text-red-700', bgColor: '#fee2e2' }
};

export const REQUISITION_STATUS = {
  draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-700' },
  pending_approval: { label: 'Pendiente Aprobación', color: 'bg-yellow-50 text-yellow-700' },
  approved: { label: 'Aprobada', color: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rechazada', color: 'bg-red-50 text-red-700' },
  closed: { label: 'Cerrada', color: 'bg-slate-100 text-slate-700' }
};

export const VACANCY_STATUS = {
  draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-700' },
  published: { label: 'Publicada', color: 'bg-green-50 text-green-700' },
  closed: { label: 'Cerrada', color: 'bg-slate-100 text-slate-700' },
  on_hold: { label: 'En Pausa', color: 'bg-yellow-50 text-yellow-700' }
};

export const OFFER_STATUS = {
  draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-700' },
  pending: { label: 'Pendiente', color: 'bg-yellow-50 text-yellow-700' },
  sent: { label: 'Enviada', color: 'bg-blue-50 text-blue-700' },
  accepted: { label: 'Aceptada', color: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rechazada', color: 'bg-red-50 text-red-700' },
  expired: { label: 'Expirada', color: 'bg-slate-100 text-slate-700' }
};

export const USER_ROLES = {
  admin: { label: 'Administrador', color: 'bg-purple-50 text-purple-700' },
  recruiter: { label: 'Reclutador', color: 'bg-blue-50 text-blue-700' },
  hiring_manager: { label: 'Hiring Manager', color: 'bg-cyan-50 text-cyan-700' },
  viewer: { label: 'Visor', color: 'bg-slate-100 text-slate-700' }
};

export const SOURCE_OPTIONS = [
  { value: 'portal', label: 'Portal de Empleos' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'referral', label: 'Referido' },
  { value: 'direct', label: 'Aplicación Directa' },
  { value: 'university', label: 'Universidad' },
  { value: 'other', label: 'Otro' }
];

export const JOB_TYPES = [
  { value: 'full_time', label: 'Tiempo Completo' },
  { value: 'part_time', label: 'Medio Tiempo' },
  { value: 'contract', label: 'Por Contrato' },
  { value: 'internship', label: 'Pasantía' },
  { value: 'temporary', label: 'Temporal' }
];
