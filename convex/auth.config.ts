/**
 * Configuración de autenticación para Convex
 * 
 * Define los emails de administradores con acceso total
 */

export const ADMIN_EMAILS = [
  "camilo.alegria@ejemplo.com", // Reemplaza con tu email real
  // Agrega más emails de administradores si es necesario
];

/**
 * Verifica si un usuario es administrador
 * @param email - Email del usuario
 * @returns true si el usuario es administrador
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Obtiene el email del usuario desde el contexto de autenticación
 * @param userIdentity - Identidad del usuario de Clerk
 * @returns Email del usuario o null
 */
export function getUserEmail(userIdentity: any): string | null {
  if (!userIdentity) return null;
  return userIdentity.email ?? null;
}

// Export por defecto requerido por Convex
export default {
  providers: [],
};
