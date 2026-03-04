import { useDashboardStats, useSurveys, usePanelAgents } from '../api';
import { Users, FileText, CheckCircle2, MessageSquare } from 'lucide-react';

export default function DashboardPage() {
  const stats = useDashboardStats();
  const surveys = useSurveys() || [];
  const agents = usePanelAgents() || [];

  const totalAgents = agents.length;
  const activeSurveys = surveys.filter((s: any) => s.status === 'running').length;
  const completedSurveys = surveys.filter((s: any) => s.status === 'completed').length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Bienvenido, Admin</h2>
        <p className="text-gray-500 mt-1">Aquí tienes el estado actual de tu panel sintético.</p>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          title="Panelistas Activos" 
          value={totalAgents} 
          icon={<Users className="h-4 w-4 text-blue-600" />} 
          desc="Ciudadanos simulados listos" 
        />
        <StatCard 
          title="Encuestas en Curso" 
          value={activeSurveys} 
          icon={<FileText className="h-4 w-4 text-green-600" />} 
          desc="Recopilando opiniones ahora" 
        />
        <StatCard 
          title="Estudios Finalizados" 
          value={completedSurveys} 
          icon={<CheckCircle2 className="h-4 w-4 text-gray-600" />} 
          desc="Histórico total" 
        />
      </div>

      {/* Estadísticas adicionales */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen General</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total de Encuestas</span>
              <span className="font-semibold">{surveys.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Encuestas Borrador</span>
              <span className="font-semibold">{surveys.filter((s: any) => s.status === 'draft').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Panelistas</span>
              <span className="font-semibold">{totalAgents}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="space-y-2">
            <a 
              href="/dashboard/encuestas" 
              className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <MessageSquare size={20} />
              <span className="font-medium">Crear Nueva Encuesta</span>
            </a>
            <a 
              href="/dashboard/agentes" 
              className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            >
              <Users size={20} />
              <span className="font-medium">Ver Panelistas</span>
            </a>
          </div>
        </div>
      </div>

      {/* Últimas encuestas */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Últimas Encuestas</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {surveys.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No hay encuestas todavía. ¡Crea tu primera encuesta!
            </div>
          ) : (
            surveys.slice(0, 5).map((survey: any) => (
              <div key={survey._id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{survey.question}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(survey.createdAt).toLocaleDateString('es-CL')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  survey.status === 'running' ? 'bg-green-100 text-green-800' :
                  survey.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {survey.status === 'running' ? 'En curso' :
                   survey.status === 'completed' ? 'Completada' : 'Borrador'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, desc }: { title: string; value: number; icon: React.ReactNode; desc: string }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  );
}