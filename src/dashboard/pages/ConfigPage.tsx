import { useState } from 'react';
import { Settings, Key, Database, Bell, Shield } from 'lucide-react';

export default function ConfigPage() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSaveKey = () => {
    // Aquí se guardaría la clave de OpenAI de forma segura
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Configuración</h1>
        <p className="text-gray-600 mt-2">Administra la configuración del sistema</p>
      </div>

      <div className="space-y-6">
        {/* API Keys */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key size={24} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Claves API</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OpenAI API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSaveKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
              {saved && (
                <p className="text-green-600 text-sm mt-2">✓ Clave guardada correctamente</p>
              )}
              <p className="text-gray-500 text-sm mt-2">
                La clave se usa para ejecutar encuestas con los agentes de IA.
                Configúrala en las variables de entorno de Convex para mayor seguridad.
              </p>
            </div>
          </div>
        </div>

        {/* Base de datos */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database size={24} className="text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">Base de Datos</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Proveedor</span>
              <span className="font-medium text-gray-800">Convex</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Estado</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">Conectado</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Región</span>
              <span className="font-medium text-gray-800">US East</span>
            </div>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell size={24} className="text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-800">Notificaciones</h2>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700">Notificar cuando una encuesta se complete</span>
              <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-700">Resumen semanal por correo</span>
              <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
            </label>
          </div>
        </div>

        {/* Seguridad */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={24} className="text-red-600" />
            <h2 className="text-lg font-semibold text-gray-800">Seguridad</h2>
          </div>
          
          <div className="space-y-3">
            <p className="text-gray-600 text-sm">
              El acceso al dashboard está protegido por autenticación.
              Solo usuarios autorizados pueden crear y ejecutar encuestas.
            </p>
            <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
              Ver logs de acceso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
