/**
 * Middleware de autenticación y autorización para Convex
 * 
 * Proporciona funciones para verificar si el usuario es administrador
 * antes de ejecutar operaciones críticas.
 */

import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { isAdmin, getUserEmail } from "./auth.config";

/**
 * Error lanzado cuando un usuario no autorizado intenta acceder
 */
export class UnauthorizedError extends Error {
  constructor(message = "Acceso denegado. Se requiere autenticación de administrador.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Verifica si el usuario actual es administrador en un contexto de query
 * @param ctx - Contexto de la query
 * @throws {UnauthorizedError} Si el usuario no es administrador
 * @returns El email del usuario si es administrador
 */
export async function requireAdminQuery(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new UnauthorizedError("Usuario no autenticado");
  }
  
  const email = getUserEmail(identity);
  
  if (!email || !isAdmin(email)) {
    throw new UnauthorizedError(`Acceso denegado. El email ${email} no tiene permisos de administrador.`);
  }
  
  return email;
}

/**
 * Verifica si el usuario actual es administrador en un contexto de mutación
 * @param ctx - Contexto de la mutación
 * @throws {UnauthorizedError} Si el usuario no es administrador
 * @returns El email del usuario si es administrador
 */
export async function requireAdminMutation(ctx: MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new UnauthorizedError("Usuario no autenticado");
  }
  
  const email = getUserEmail(identity);
  
  if (!email || !isAdmin(email)) {
    throw new UnauthorizedError(`Acceso denegado. El email ${email} no tiene permisos de administrador.`);
  }
  
  return email;
}

/**
 * Verifica si el usuario está autenticado (sin requerir admin)
 * @param ctx - Contexto de query o mutación
 * @throws {UnauthorizedError} Si el usuario no está autenticado
 * @returns La identidad del usuario
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new UnauthorizedError("Usuario no autenticado");
  }
  
  return identity;
}

/**
 * Verifica si el usuario actual es administrador en un contexto de action
 * @param ctx - Contexto de la action
 * @throws {UnauthorizedError} Si el usuario no es administrador
 * @returns El email del usuario si es administrador
 */
export async function requireAdminAction(ctx: ActionCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new UnauthorizedError("Usuario no autenticado");
  }
  
  const email = getUserEmail(identity);
  
  if (!email || !isAdmin(email)) {
    throw new UnauthorizedError(`Acceso denegado. El email ${email} no tiene permisos de administrador.`);
  }
  
  return email;
}

/**
 * Helper para verificar permisos de forma opcional
 * @param ctx - Contexto de query
 * @returns Objeto con el estado de autenticación
 */
export async function getAuthStatus(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      email: null,
    };
  }
  
  const email = getUserEmail(identity);
  
  return {
    isAuthenticated: true,
    isAdmin: email ? isAdmin(email) : false,
    email,
  };
}
