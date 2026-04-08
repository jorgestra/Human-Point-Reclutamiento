import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Pipeline } from './pages/Pipeline';
import { Requisitions } from './pages/Requisitions';
import { Vacancies } from './pages/Vacancies';
import { Candidates, CandidateDetail } from './pages/Candidates';
import { Interviews } from './pages/Interviews';
import { Offers } from './pages/Offers';
import { Hirings } from './pages/Hirings';
import { Employees } from './pages/Employees';
import { Reports } from './pages/Reports';
import { JobBoard, JobDetail } from './pages/JobBoard';
import { RequisitionDetail } from './pages/RequisitionDetail';
import { Companies } from './pages/Companies';
import { HRPersonnel } from './pages/HRPersonnel';
import Settings from './pages/Settings';
import SearchCandidates from './pages/SearchCandidates';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/jobs" element={<JobBoard />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          
          {/* Protected Routes */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/requisitions" element={<Requisitions />} />
            <Route path="/requisitions/:id" element={<RequisitionDetail />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/vacancies" element={<Vacancies />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/candidates/:id" element={<CandidateDetail />} />
            <Route path="/search-candidates" element={<SearchCandidates />} />
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/hirings" element={<Hirings />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/hr-personnel" element={<HRPersonnel />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
