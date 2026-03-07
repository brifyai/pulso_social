/**
 * Componente de Protección de Autenticación
 * 
 * Verifica que el usuario esté autenticado y sea administrador.
 * Si no, muestra una pantalla de acceso restringido.
 */

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';

// EMAILS DE ADMINISTRADORES - Actualiza con tu email real
const ADMIN_EMAILS = [
  "camilo.alegria@ejemplo.com", // ← CAMBIA ESTO por tu email real
];

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoaded } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      if (!user) {
        // Usuario no autenticado
        setIsAuthorized(false);
      } else {
        // Verificar si el email es de administrador
        const userEmail = user.primaryEmailAddress?.emailAddress;
        const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());
        setIsAuthorized(!!isAdmin);
      }
      setIsLoading(false);
    }
  }, [user, isLoaded]);

  // Mostrando estado de carga
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Verificando credenciales...</p>
        </div>
      </div>
    );
  }

  // Usuario no autenticado - mostrar mensaje de login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-md mx-auto text-center p-8 bg-gray-800 rounded-lg shadow-xl">
          <h1 className="text-3xl font-bold text-white mb-4">🔐 Acceso Restringido</h1>
          <p className="text-gray-300 mb-6">
            Debes iniciar sesión para acceder a Pulso Social.
          </p>
          <p className="text-gray-400 text-sm">
            Esta es una herramienta privada de simulación. Solo personal autorizado puede acceder.
          </p>
        </div>
      </div>
    );
  }

  // Usuario autenticado pero no es admin
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-md mx-auto text-center p-8 bg-gray-800 rounded-lg shadow-xl">
          <h1 className="text-3xl font-bold text-red-500 mb-4">⛔ Acceso Denegado</h1>
          <p className="text-gray-300 mb-2">
            Lo sentimos, no tienes permisos para acceder a esta aplicación.
          </p>
          <p className="text-gray-400 text-sm mb-4">
            Email registrado: <span className="text-white">{user.primaryEmailAddress?.emailAddress}</span>
          </p>
          <p className="text-gray-500 text-xs">
            Si crees que esto es un error, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    );
  }

  // Usuario autorizado - mostrar contenido
  return <>{children}</>;
}

/**
 * Hook para verificar estado de autenticación
 */
export function useAuth() {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded || !user) {
    return { isAuthenticated: false, isAdmin: false, email: null };
  }
  
  const email = user.primaryEmailAddress?.emailAddress;
  const isAdmin = email && ADMIN_EMAILS.includes(email.toLowerCase());
  
  return {
    isAuthenticated: true,
    isAdmin: !!isAdmin,
    email,
  };
}

/**
 * Componente para mostrar contenido solo a administradores
 * Útil para ocultar botones específicos dentro de una página
 */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  
  if (!isAdmin) {
    return null;
  }
  
  return <>{children}</>;
}