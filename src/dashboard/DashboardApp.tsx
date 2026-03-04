import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConvexReactClient, ConvexProvider } from 'convex/react';
import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import SurveysPage from './pages/SurveysPage';
import AgentsPage from './pages/AgentsPage';

function convexUrl(): string {
  const url = import.meta.env.VITE_CONVEX_URL as string;
  if (!url) {
    throw new Error('Couldn\'t find the Convex deployment URL.');
  }
  return url;
}

const convex = new ConvexReactClient(convexUrl(), { unsavedChangesWarning: false });

export default function DashboardApp() {
  return (
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard" element={
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          } />
          <Route path="/dashboard/encuestas" element={
            <DashboardLayout>
              <SurveysPage />
            </DashboardLayout>
          } />
          <Route path="/dashboard/agentes" element={
            <DashboardLayout>
              <AgentsPage />
            </DashboardLayout>
          } />
          <Route path="/dashboard/resultados" element={
            <DashboardLayout>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">Resultados</h2>
                <p className="text-gray-500 mt-2">Próximamente...</p>
              </div>
            </DashboardLayout>
          } />
          <Route path="/dashboard/config" element={
            <DashboardLayout>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
                <p className="text-gray-500 mt-2">Próximamente...</p>
              </div>
            </DashboardLayout>
          } />
        </Routes>
      </BrowserRouter>
    </ConvexProvider>
  );
}