import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Game from './components/Game.tsx';

import { ToastContainer } from 'react-toastify';
import starImg from '../assets/star.svg';
import helpImg from '../assets/help.svg';
import chartImg from '../assets/chart-bar.svg';
import { useState } from 'react';
import ReactModal from 'react-modal';
import MusicButton from './components/buttons/MusicButton.tsx';
import Button from './components/buttons/Button.tsx';
import InteractButton from './components/buttons/InteractButton.tsx';
import FreezeButton from './components/FreezeButton.tsx';
import { MAX_HUMAN_PLAYERS } from '../convex/constants.ts';
import PoweredByConvex from './components/PoweredByConvex.tsx';

// Componentes del Dashboard
import DashboardLayout from './dashboard/components/DashboardLayout.tsx';
import DashboardPage from './dashboard/pages/DashboardPage.tsx';
import SurveysPage from './dashboard/pages/SurveysPage.tsx';
import ResultsPage from './dashboard/pages/ResultsPage.tsx';
import AgentsPage from './dashboard/pages/AgentsPage.tsx';
import ConfigPage from './dashboard/pages/ConfigPage.tsx';

// Componente del Juego (AI Town)
function GamePage() {
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden font-body game-background">
      <ReactModal
        isOpen={helpModalOpen}
        onRequestClose={() => setHelpModalOpen(false)}
        style={modalStyles}
        contentLabel="Modal de ayuda"
        ariaHideApp={false}
      >
        <div className="font-body">
          <h1 className="text-center text-6xl font-bold font-display game-title">Ayuda</h1>
          <p>
            Bienvenido a AI Town. AI Town soporta tanto <i>espectadores</i> anónimos como{' '}
            <i>interactividad</i> con sesión iniciada.
          </p>
          <h2 className="text-4xl mt-4">Espectador</h2>
          <p>
            Haz clic y arrastra para moverte por la ciudad, y usa la rueda del ratón para hacer zoom.
            Puedes hacer clic en un personaje para ver su historial de chat.
          </p>
          <h2 className="text-4xl mt-4">Interactividad</h2>
          <p>
            ¡Si inicias sesión, puedes unirte a la simulación y hablar directamente con diferentes
            agentes! Después de iniciar sesión, haz clic en el botón "Interactuar", y tu personaje
            aparecerá en algún lugar del mapa con un círculo resaltado debajo de ti.
          </p>
          <p className="text-2xl mt-2">Controles:</p>
          <ul className="list-disc ml-8 mt-2">
            <li>WASD o flechas para moverte</li>
            <li>Click para interactuar</li>
            <li>E para hablar</li>
          </ul>
          <p className="mt-4">Haz clic para navegar.</p>
          <p className="mt-4">
            Para hablar con un agente, haz clic en ellos y luego en "Iniciar conversación", lo que
            les pedirá que vengan hacia ti. Una vez que estén cerca, la conversación comenzará y
            pueden hablar entre sí. Puedes irte en cualquier momento cerrando el panel de
            conversación o alejándote. Ellos pueden proponerte una conversación - verás un botón
            para aceptar en el panel de mensajes.
          </p>
          <p className="mt-4">
            AI Town solo soporta {MAX_HUMAN_PLAYERS} humanos a la vez. Si estás inactivo durante
            cinco minutos, serás eliminado automáticamente de la simulación.
          </p>
        </div>
      </ReactModal>

      <div className="w-full h-full relative isolate overflow-hidden flex flex-col">
        {/* Header con logo pixel art */}
        <div className="flex w-full items-center justify-between px-4 py-2 bg-black/30">
          <h1
            className="whitespace-nowrap text-center text-lg sm:text-xl md:text-2xl pointer-events-none select-none"
            style={{
              fontFamily: '"Press Start 2P", cursive',
              color: '#fbbf24',
              textShadow: '4px 4px 0px #2e1065',
              WebkitTextStroke: '2px #2e1065',
              paintOrder: 'stroke fill',
              letterSpacing: '-1px'
            }}
          >
            PULSO SOCIAL
          </h1>
          <div className="text-xs sm:text-sm text-white/80 text-right max-w-xs ml-4">
            Panel de encuestas con agentes de IA representando ciudadanos chilenos
          </div>
        </div>

        {/* Área del juego - pantalla completa */}
        <div className="flex-1 relative">
          <Game />
        </div>

        {/* Footer con botones */}
        <footer className="justify-end bottom-0 left-0 w-full flex items-center gap-3 p-4 flex-wrap pointer-events-none bg-black/20">
          <div className="flex gap-3 flex-grow pointer-events-none">
            <FreezeButton />
            <MusicButton />
            <Button href="https://github.com/a16z-infra/ai-town" imgUrl={starImg}>
              Favorito
            </Button>
            <InteractButton />
            <Button imgUrl={helpImg} onClick={() => setHelpModalOpen(true)}>
              Ayuda
            </Button>
            {/* Botón Dashboard - Usa el mismo componente que los otros botones */}
            <Button
              href="/ai-town/dashboard"
              imgUrl={chartImg}
            >
              Dashboard
            </Button>
          </div>
        </footer>
        <ToastContainer position="bottom-right" autoClose={2000} closeOnClick theme="dark" />
      </div>
    </main>
  );
}

const modalStyles = {
  overlay: {
    backgroundColor: 'rgb(0, 0, 0, 75%)',
    zIndex: 12,
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: '50%',

    border: '10px solid rgb(23, 20, 33)',
    borderRadius: '0',
    background: 'rgb(35, 38, 58)',
    color: 'white',
    fontFamily: '"Upheaval Pro", "sans-serif"',
  },
};

// App principal con Router
export default function App() {
  return (
    <Router basename="/ai-town">
      <Routes>
        {/* RUTA 1: El Juego original (Página de inicio) */}
        <Route path="/" element={<GamePage />} />

        {/* RUTA 2: Dashboard de Pulso Social */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Página principal del dashboard */}
          <Route index element={<DashboardPage />} />
          {/* Página de encuestas */}
          <Route path="encuestas" element={<SurveysPage />} />
          {/* Página de resultados */}
          <Route path="resultados" element={<ResultsPage />} />
          {/* Página de agentes */}
          <Route path="agentes" element={<AgentsPage />} />
          {/* Página de configuración */}
          <Route path="config" element={<ConfigPage />} />
        </Route>

        {/* Redirigir cualquier ruta desconocida al juego */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
