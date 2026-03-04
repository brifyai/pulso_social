import { useSurveys, useSurveyResponses } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, TrendingUp } from 'lucide-react';

export default function ResultsPage() {
  const surveys = useSurveys();
  const completedSurveys = surveys.filter(s => s.status === 'completed');

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Resultados de Encuestas</h1>
        <p className="text-gray-600 mt-2">Análisis detallado de las encuestas completadas</p>
      </div>

      {completedSurveys.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No hay resultados aún</h3>
          <p className="text-gray-500 mt-2">Completa una encuesta para ver los resultados aquí</p>
        </div>
      ) : (
        <div className="space-y-6">
          {completedSurveys.map((survey) => (
            <SurveyResultCard key={survey._id} survey={survey} colors={COLORS} />
          ))}
        </div>
      )}
    </div>
  );
}

function SurveyResultCard({ survey, colors }: { survey: any; colors: string[] }) {
  const responses = useSurveyResponses(survey._id);

  // Procesar respuestas para el gráfico
  const responseCounts = survey.options.map((option: string) => ({
    name: option,
    votos: responses.filter((r: any) => r.response === option).length,
  }));

  const totalVotes = responses.length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-green-100 rounded-lg">
          <FileText size={24} className="text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{survey.question}</h3>
          {survey.context && (
            <p className="text-gray-600 text-sm mt-1">{survey.context}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            {totalVotes} respuestas • Completada {new Date(survey.completedAt || survey.createdAt).toLocaleDateString('es-CL')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={responseCounts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="votos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de torta */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={responseCounts}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="votos"
              >
                {responseCounts.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla de respuestas detalladas */}
      {responses.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Respuestas individuales</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Agente</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Respuesta</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Razón</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {responses.slice(0, 10).map((response: any) => (
                  <tr key={response._id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{response.playerName}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{response.response}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{response.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
