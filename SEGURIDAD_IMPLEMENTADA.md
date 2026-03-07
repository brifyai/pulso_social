# Seguridad Implementada - Modo Admin Privado

## Resumen

Se ha implementado un sistema de seguridad completo para restringir el acceso a la aplicación **Pulso Social** solo a administradores autorizados.

## Fecha de Implementación
6 de Marzo, 2026

## Arquitectura de Seguridad

### 1. Configur de Autenticación (`convex/auth.config.ts`)

```typescript
export const ADMIN_EMAILS = [
  "camilo.alegria@ejemplo.com", // ← CAMBIAR por tu email real
];
```

**Funciones:**
- `isAdmin(email)`: Verifica si un email está en la lista de administradores
- `getUserEmail()`: Extrae el email de la identidad de Clerk

### 2. Middleware de Autenticación (`convex/auth.ts`)

**Funciones disponibles:**

| Función | Contexto | Descripción |
|---------|----------|-------------|
| `requireAdminQuery` | Query | Verifica admin en queries |
| `requireAdminMutation` | Mutation | Verifica admin en mutaciones |
| `requireAdminAction` | Action | Verifica admin en actions |
| `requireAuth` | Query/Mutation | Solo verifica autenticación |
| `getAuthStatus` | Query | Obtiene estado sin lanzar error |

**Error lanzado:**
```typescript
class UnauthorizedError extends Error {
  message = "Acceso denegado. Se requiere autenticación de administrador."
}
```

### 3. Componentes Frontend (`src/components/AuthGuard.tsx`)

**Componentes exportados:**

| Componente | Uso |
|------------|-----|
| `<AuthGuard>` | Envuelve toda la app/dashboard |
| `<AdminOnly>` | Muestra contenido solo a admins |
| `useAuth()` | Hook para verificar estado |

**Pantallas de error:**
- **No autenticado**: "🔐 Acceso Restringido - Debes iniciar sesión"
- **No admin**: "⛔ Acceso Denegado - Email no autorizado"

### 4. Rutas Protegidas (`src/App.tsx`)

```typescript
// Dashboard completo protegido
<Route path="/dashboard" element={
  <AuthGuard>
    <DashboardLayout />
  </AuthGuard>
}>

// Páginas específicas solo para admins
<Route path="encuestas" element={
  <AdminOnlyWrapper>
    <SurveysPage />
  </AdminOnlyWrapper>
} />
<Route path="config" element={
  <AdminOnlyWrapper>
    <ConfigPage />
  </AdminOnlyWrapper>
} />
```

## Funciones Backend Protegidas

### `convex/runSurvey.ts`
- ✅ `runSurvey` - Solo admins pueden ejecutar encuestas

### `convex/pulso/agents.ts`
- ✅ `bulkInsertPanelAgents` - Solo admins pueden insertar agentes
- ✅ `clearPanelAgents` - Solo admins pueden limpiar agentes
- ✅ `bulkInsertPublic` - Solo admins pueden cargar masivamente
- ✅ `migrateAgentsToAiTown` - Solo admins pueden migrar agentes
- ✅ `kickEngine` - Solo admins pueden reiniciar el motor
- ✅ `updateEngineTime` - Solo admins pueden actualizar tiempo
- ✅ `clearBlockingFinishDoSomethingInputs` - Solo admins pueden limpiar inputs
- ✅ `clearPendingMigrationInputsBatch` - Solo admins pueden limpiar inputs
- ✅ `clearPendingMigrationInputs` - Solo admins pueden limpiar inputs
- ✅ `migrateAgentsDirectly` - Solo admins pueden migrar directamente

## Configuración Requerida

### 1. Actualizar Email de Administrador

**Archivo:** `convex/auth.config.ts`
```typescript
export const ADMIN_EMAILS = [
  "tu-email-real@ejemplo.com", // ← CAMBIAR ESTO
];
```

**Archivo:** `src/components/AuthGuard.tsx`
```typescript
const ADMIN_EMAILS = [
  "tu-email-real@ejemplo.com", // ← CAMBIAR ESTO TAMBIÉN
];
```

### 2. Configurar Clerk en Convex

El proyecto ya tiene Clerk configurado (`@clerk/clerk-react` en package.json).

Para verificar la configuración:
1. Ir a [Clerk Dashboard](https://dashboard.clerk.com/)
2. Verificar que el email del administrador esté registrado
3. Configurar las variables de entorno en Convex:
   ```bash
   npx convex env set CLERK_SECRET_KEY sk_test_...
   npx convex env set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY pk_test_...
   ```

## Comandos Útiles

### Verificar estado de autenticación
```bash
# No hay comando directo, verificar desde el frontend
```

### Probar protección
1. Abrir la aplicación sin login → Debería mostrar "Acceso Restringido"
2. Login con email no admin → Debería mostrar "Acceso Denegado"
3. Login con email admin → Debería permitir acceso

## Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────┐
│                    Usuario accede a la app                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  ¿Autenticado?  │
                    └─────────────────┘
                         │         │
                         NO        SI
                         │         │
                         ▼         ▼
            ┌────────────────┐  ┌──────────────────┐
            │ Pantalla Login │  │ ¿Es Admin Email? │
            └────────────────┘  └──────────────────┘
                                      │         │
                                      NO        SI
                                      │         │
                                      ▼         ▼
                              ┌───────────┐  ┌──────────┐
                              │ Denegado  │  │ Permitido│
                              └───────────┘  └──────────┘
```

## Funciones NO Protegidas (Públicas)

Las siguientes funciones permanecen públicas para permitir lectura:

### `convex/pulso/agents.ts`
- `getAllPanelAgents` - Query pública (lectura)
- `getVisiblePanelAgents` - Query pública (lectura)
- `getPanelAgentsByRegion` - Query pública (lectura)
- `getPanelAgentsByGSE` - Query pública (lectura)
- `getDefaultWorldId` - Query pública (lectura)
- `countMigrationInputs` - Query pública (lectura)
- `getEngineStatus` - Query pública (lectura)
- `getMigrationInputErrors` - Query pública (lectura)
- `getRecentMigrationInputs` - Query pública (lectura)
- `countMigrationInputsByCharacter` - Query pública (lectura)
- `getSimpleEngineStatus` - Query pública (lectura)
- `countAiTownAgents` - Query pública (lectura)
- `findMigrationInputsPosition` - Query pública (lectura)
- `analyzePendingInputs` - Query pública (lectura)
- `getWorldNextId` - Query pública (lectura)

**Nota:** Las queries de lectura se mantienen públicas para permitir que el dashboard muestre información. Solo las mutaciones (escritura) están protegidas.

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `convex/auth.config.ts` | Creado - Configuración de emails admin |
| `convex/auth.ts` | Creado/Actualizado - Middleware de autenticación |
| `src/components/AuthGuard.tsx` | Creado - Componentes de protección frontend |
| `src/App.tsx` | Modificado - Rutas protegidas |
| `convex/runSurvey.ts` | Modificado - Protección con requireAdminAction |
| `convex/pulso/agents.ts` | Modificado - Protección de mutaciones |

## Próximos Pasos

1. **Actualizar emails** con tu email real de administrador
2. **Verificar Clerk** esté configurado correctamente
3. **Probar flujo** de autenticación completo
4. **Considerar** agregar más administradores si es necesario

## Recomendaciones de Seguridad

1. **Nunca commitear emails reales** en el repositorio de producción
2. **Usar variables de entorno** para emails sensibles:
   ```typescript
   export const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",") || [];
   ```
3. **Rotar claves** de Clerk periódicamente
4. **Monitorear logs** de intentos de acceso denegado
5. **Considerar 2FA** para administradores

## Solución de Problemas

### "Usuario no autenticado"
- Verificar que Clerk esté configurado
- Verificar que el usuario haya iniciado sesión

### "Acceso denegado"
- Verificar que el email esté en `ADMIN_EMAILS`
- Verificar que el email coincida exactamente (case-sensitive)

### "CLERK_SECRET_KEY no encontrada"
- Configurar variables de entorno en Convex Dashboard