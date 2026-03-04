import { usePanelAgents, useCreatePanelAgent, useDeletePanelAgent } from '../api';
import { useState } from 'react';
import { PlusCircle, Trash2, Users } from 'lucide-react';

export default function AgentsPage() {
  const agents = usePanelAgents() || [];
  const createAgent = useCreatePanelAgent();
  const deleteAgent = useDeletePanelAgent();
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    playerId: '',
    name: '',
    age: 30,
    gse: 'C1a',
    region: 'Metropolitana',
    comuna: 'Santiago',
    politicalLeaning: 0,
    interests: [] as string[],
  });
  const [interestInput, setInterestInput] = useState('');

  const gseOptions = ['AB', 'C1a', 'C1b', 'C2', 'C3', 'D', 'E'];
  const regionOptions = [
    'Metropolitana', 'Valparaíso', 'Biobío', ' Maule', 'Los Lagos',
    'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
    'O\'Higgins', 'Ñuble', 'Araucanía', 'Los Ríos', 'Aysén'
  ];

  const handleCreate = async () => {
    if (!formData.playerId || !formData.name) return;
    
    try {
      // Get worldId from existing data or use a placeholder
      const worldId = 'm17a392bywc3418a0smxa5rybn828634' as any;
      
      await createAgent({
        playerId: formData.playerId,
        name: formData.name,
        age: formData.age,
        gse: formData.gse,
        region: formData.region,
        comuna: formData.comuna,
        politicalLeaning: formData.politicalLeaning,
        interests: formData.interests,
        worldId,
      });
      
      setFormData({
        playerId: '',
        name: '',
        age: 30,
        gse: 'C1a',
        region: 'Metropolitana',
        comuna: 'Santiago',
        politicalLeaning: 0,
        interests: [],
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este panelista?')) return;
    try {
      await deleteAgent({ id: agentId as any });
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const addInterest = () => {
    if (interestInput.trim() && !formData.interests.includes(interestInput.trim())) {
      setFormData({
        ...formData,
        interests: [...formData.interests, interestInput.trim()],
      });
      setInterestInput('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter(i => i !== interest),
    });
  };

  const getGSEColor = (gse: string) => {
    switch (gse) {
      case 'AB': return 'bg-purple-100 text-purple-800';
      case 'C1a': return 'bg-blue-100 text-blue-800';
      case 'C1b': return 'bg-cyan-100 text-cyan-800';
      case 'C2': return 'bg-green-100 text-green-800';
      case 'C3': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'E': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panelistas</h2>
          <p className="text-gray-500">Gestiona los agentes del panel sintético</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle size={20} />
          Nuevo Panelista
        </button>
      </div>

      {/* Formulario de nuevo agente */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Agregar Panelista</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID del Jugador</label>
              <input
                type="text"
                value={formData.playerId}
                onChange={(e) => setFormData({...formData, playerId: e.target.value})}
                placeholder="p:100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Juan Pérez"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                min={18}
                max={90}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSE</label>
              <select
                value={formData.gse}
                onChange={(e) => setFormData({...formData, gse: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {gseOptions.map(gse => (
                  <option key={gse} value={gse}>{gse}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({...formData, region: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {regionOptions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comuna</label>
              <input
                type="text"
                value={formData.comuna}
                onChange={(e) => setFormData({...formData, comuna: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tendencia Política (-100 a 100)
            </label>
            <input
              type="range"
              value={formData.politicalLeaning}
              onChange={(e) => setFormData({...formData, politicalLeaning: parseInt(e.target.value)})}
              min={-100}
              max={100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Izquierda</span>
              <span>Centro</span>
              <span>Derecha</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intereses</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                placeholder="Agregar interés"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={addInterest}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Agregar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.interests.map(interest => (
                <span key={interest} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1">
                  {interest}
                  <button onClick={() => removeInterest(interest)} className="hover:text-blue-900">×</button>
                </span>
              ))}
            </div>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Crear Panelista
            </button>
          </div>
        </div>
      )}

      {/* Lista de agentes */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Users size={20} className="text-gray-500" />
          <span className="font-semibold text-gray-900">Total: {agents.length} panelistas</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Edad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GSE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Región</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comuna</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tendencia</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No hay panelistas todavía. Agrega tu primer panelista.
                  </td>
                </tr>
              ) : (
                agents.map((agent: any) => (
                  <tr key={agent._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.playerId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{agent.age} años</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGSEColor(agent.gse)}`}>
                        {agent.gse}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{agent.region}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{agent.comuna}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 via-gray-500 to-blue-500" 
                          style={{ width: `${((agent.politicalLeaning + 100) / 2)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDelete(agent._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}