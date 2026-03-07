import { useState } from 'react';
import { useSurveys, useCreateSurvey, useDeleteSurvey, useUpdateSurveyStatus, useGetChileanNews } from '../api';
import { PlusCircle, Trash2, Play, Pause, CheckCircle, Send, RefreshCw } from 'lucide-react';

export default function SurveysPage() {
  const surveys = useSurveys() || [];
  const createSurvey = useCreateSurvey();
  const deleteSurvey = useDeleteSurvey();
  const updateStatus = useUpdateSurveyStatus();
  const getChileanNews = useGetChileanNews();
  
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [options, setOptions] = useState(['Apruebo', 'Rechazo']);
  const [loading, setLoading] = useState(false);
  const [syncingNews, setSyncingNews] = useState(false);
  const [newsResult, setNewsResult] = useState<string | null>(null);

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = async () => {
    if (!question.trim() || options.some(o => !o.trim())) return;
    
    setLoading(true);
    try {
      await createSurvey({
        question,
        context: context || undefined,
        options: options.filter(o => o.trim()),
        status: 'draft',
      });
      setQuestion('');
      setContext('');
      setOptions(['Apruebo', 'Rechazo']);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating survey:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async (surveyId: string) => {
    try {
      await updateStatus({ id: surveyId, status: 'running' });
    } catch (error) {
      console.error('Error launching survey:', error);
    }
  };

  const handleComplete = async (surveyId: string) => {
    try {
      await updateStatus({ id: surveyId, status: 'completed' });
    } catch (error) {
      console.error('Error completing survey:', error);
    }
  };

  const handleDelete = async (surveyId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta encuesta?')) return;
    try {
      await deleteSurvey({ id: surveyId });
    } catch (error) {
      console.error('Error deleting survey:', error);
    }
  };

  const handleSyncNews = async () => {
    setSyncingNews(true);
    setNewsResult(null);
    try {
      const result = await getChileanNews({ max: 5 });
      setNewsResult(result);
    } catch (error) {
      console.error('Error syncing news:', error);
      setNewsResult('Error al sincronizar noticias. Verifica que GNEWS_API_KEY esté configurada.');
    } finally {
      setSyncingNews(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Encuestas</h2>
          <p className="text-gray-500">Gestiona tus estudios de opinión</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSyncNews}
            disabled={syncingNews}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={syncingNews ? 'animate-spin' : ''} />
            {syncingNews ? 'Sincronizando...' : 'Sincronizar GNews'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle size={20} />
            Nueva Encuesta
          </button>
        </div>
      </div>

      {/* Resultado de sincronización de noticias */}
      {newsResult && (
        <div className={`p-4 rounded-lg border ${
          newsResult.includes('Error')
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <div className="flex items-start gap-2">
            <RefreshCw size={20} className="mt-0.5" />
            <div className="flex-1">
              <p className="font-medium mb-1">
                {newsResult.includes('Error') ? 'Error' : 'Sincronización completada'}
              </p>
              <pre className="text-sm whitespace-pre-wrap font-mono">{newsResult}</pre>
            </div>
            <button
              onClick={() => setNewsResult(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Formulario de nueva encuesta */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Crear Nueva Encuesta</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pregunta Principal
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ej: ¿Usted aprueba o desaprueba la gestión del Presidente?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contexto / Noticias (Opcional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Pega aquí un resumen de noticias relevantes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opciones de Respuesta
            </label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Opción ${idx + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(idx)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addOption}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Agregar opción
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !question.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={20} />
              {loading ? 'Creando...' : 'Crear Encuesta'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de encuestas */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {surveys.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay encuestas todavía. Crea tu primera encuesta.
            </div>
          ) : (
            surveys.map((survey: any) => (
              <div key={survey._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{survey.question}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        survey.status === 'running' ? 'bg-green-100 text-green-800' :
                        survey.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {survey.status === 'running' ? 'En curso' :
                         survey.status === 'completed' ? 'Completada' : 'Borrador'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      {survey.options?.length} opciones • Creada el {new Date(survey.createdAt).toLocaleDateString('es-CL')}
                    </p>
                    {survey.context && (
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        Contexto: {survey.context.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {survey.status === 'draft' && (
                      <button
                        onClick={() => handleLaunch(survey._id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Lanzar"
                      >
                        <Play size={20} />
                      </button>
                    )}
                    {survey.status === 'running' && (
                      <button
                        onClick={() => handleComplete(survey._id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Completar"
                      >
                        <CheckCircle size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(survey._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}