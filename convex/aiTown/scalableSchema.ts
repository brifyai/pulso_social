/**
 * Schema escalable para soportar 10,000+ agentes
 * 
 * Esta arquitectura usa:
 * 1. Sistema de zonas para dividir el mundo
 * 2. Agentes como documentos separados (no en el documento worlds)
 * 3. Jugadores como documentos separados
 * 4. Conversaciones como documentos separados
 * 5. Sistema de activación/desactivación para eficiencia
 */

import { v } from 'convex/values';
import { defineTable } from 'convex/server';
import { playerId, conversationId } from './ids';

// ============================================================================
// TABLAS ESCALABLES
// ============================================================================

export const scalableTables = {
  // ==========================================================================
  // ZONAS - Dividen el mundo en áreas manejables
  // ==========================================================================
  zones: defineTable({
    worldId: v.id('worlds'),
    name: v.string(),
    description: v.optional(v.string()),
    // Límites de la zona
    bounds: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    // Configuración de la zona
    maxAgents: v.optional(v.number()),
    maxPlayers: v.optional(v.number()),
    // Estado
    isActive: v.boolean(),
    // Contadores
    activeAgentsCount: v.optional(v.number()),
    idleAgentsCount: v.optional(v.number()),
    playersCount: v.optional(v.number()),
  })
    .index('worldId', ['worldId'])
    .index('worldId_active', ['worldId', 'isActive']),

  // ==========================================================================
  // AGENTES - Documentos separados (no en worlds)
  // ==========================================================================
  agents: defineTable({
    worldId: v.id('worlds'),
    zoneId: v.id('zones'),
    
    // Identidad básica
    playerId: v.string(),
    name: v.string(),
    
    // Posición y estado
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    facing: v.optional(v.object({
      dx: v.number(),
      dy: v.number(),
    })),
    
    // Estado del agente
    status: v.union(
      v.literal('idle'),
      v.literal('active'),
      v.literal('moving'),
      v.literal('conversation'),
      v.literal('waiting'),
    ),
    
    // Control de actividad
    lastActive: v.number(),
    lastTick: v.optional(v.number()),
    tickCounter: v.optional(v.number()),
    
    // Operación en curso
    inProgressOperation: v.optional(v.object({
      type: v.string(),
      targetId: v.optional(v.string()),
      startTime: v.number(),
      estimatedEndTime: v.optional(v.number()),
    })),
    
    // Estado de conversación
    lastConversation: v.optional(v.object({
      conversationId: v.string(),
      endTime: v.number(),
      participants: v.array(v.string()),
    })),
    lastInviteAttempt: v.optional(v.number()),
    toRemember: v.optional(v.string()),
    
    // Datos adicionales del agente
    agentData: v.optional(v.object({
      age: v.number(),
      sex: v.optional(v.string()),
      region: v.string(),
      comuna: v.string(),
      gse: v.string(),
      politicalLeaning: v.optional(v.number()),
      interests: v.optional(v.array(v.string())),
      escolaridad: v.optional(v.string()),
      sit_fuerza_trabajo: v.optional(v.string()),
      p23_est_civil: v.optional(v.string()),
    })),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('worldId', ['worldId'])
    .index('zoneId', ['zoneId'])
    .index('zone_status', ['zoneId', 'status'])
    .index('zone_lastActive', ['zoneId', 'lastActive'])
    .index('status', ['status'])
    .index('playerId', ['playerId'])
    .index('worldId_status', ['worldId', 'status']),

  // ==========================================================================
  // JUGADORES - Documentos separados (no en worlds)
  // ==========================================================================
  players: defineTable({
    worldId: v.id('worlds'),
    zoneId: v.id('zones'),
    
    id: playerId,
    name: v.string(),
    
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    facing: v.object({
      dx: v.number(),
      dy: v.number(),
    }),
    speed: v.number(),
    
    lastInput: v.number(),
    status: v.union(
      v.literal('online'),
      v.literal('offline'),
      v.literal('away'),
    ),
    
    enteredZoneAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('worldId', ['worldId'])
    .index('zoneId', ['zoneId'])
    .index('zone_status', ['zoneId', 'status'])
    .index('id', ['id'])
    .index('worldId_status', ['worldId', 'status']),

  // ==========================================================================
  // CONVERSACIONES - Documentos separados (no en worlds)
  // ==========================================================================
  conversations: defineTable({
    worldId: v.id('worlds'),
    zoneId: v.id('zones'),
    
    id: conversationId,
    creator: playerId,
    created: v.number(),
    ended: v.optional(v.number()),
    
    status: v.union(
      v.literal('active'),
      v.literal('ended'),
      v.literal('archived'),
    ),
    
    participants: v.array(v.object({
      playerId: playerId,
      agentId: v.optional(v.string()),
      joinedAt: v.number(),
      leftAt: v.optional(v.number()),
    })),
    
    lastMessage: v.optional(v.object({
      id: v.string(),
      authorId: playerId,
      text: v.string(),
      timestamp: v.number(),
    })),
    numMessages: v.number(),
    lastMessageAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('worldId', ['worldId'])
    .index('zoneId', ['zoneId'])
    .index('status', ['status'])
    .index('worldId_status', ['worldId', 'status'])
    .index('worldId_zoneId_status', ['worldId', 'zoneId', 'status']),

  // ==========================================================================
  // MENSAJES - Historial de conversaciones
  // ==========================================================================
  conversationMessages: defineTable({
    worldId: v.id('worlds'),
    zoneId: v.id('zones'),
    conversationId: conversationId,
    
    id: v.string(),
    authorId: playerId,
    authorName: v.string(),
    text: v.string(),
    timestamp: v.number(),
    createdAt: v.number(),
  })
    .index('conversationId', ['conversationId', 'timestamp'])
    .index('worldId', ['worldId', 'conversationId'])
    .index('zoneId', ['zoneId', 'conversationId']),

  // ==========================================================================
  // ARCHIVOS - Datos históricos
  // ==========================================================================
  archivedZoneAgents: defineTable({
    worldId: v.id('worlds'),
    zoneId: v.id('zones'),
    agentId: v.string(),
    playerId: v.string(),
    name: v.string(),
    archivedAt: v.number(),
    reason: v.optional(v.string()),
  })
    .index('worldId', ['worldId'])
    .index('zoneId', ['zoneId'])
    .index('agentId', ['agentId']),

  archivedZonePlayers: defineTable({
    worldId: v.id('worlds'),
    zoneId: v.id('zones'),
    playerId: playerId,
    name: v.string(),
    archivedAt: v.number(),
    reason: v.optional(v.string()),
  })
    .index('worldId', ['worldId'])
    .index('zoneId', ['zoneId'])
    .index('playerId', ['playerId']),

  archivedZoneConversations: defineTable({
    worldId: v.id('worlds'),
    zoneId: v.id('zones'),
    conversationId: conversationId,
    creator: playerId,
    created: v.number(),
    ended: v.number(),
    numMessages: v.number(),
    participantIds: v.array(playerId),
    archivedAt: v.number(),
  })
    .index('worldId', ['worldId'])
    .index('zoneId', ['zoneId'])
    .index('conversationId', ['conversationId']),

  // ==========================================================================
  // DICCIONARIO - Tabla de referencia para etiquetas descriptivas
  // ==========================================================================
  dictionaries: defineTable({
    worldId: v.id('worlds'),
    
    // Campo y valor original (código)
    field: v.string(),
    code: v.string(),
    
    // Etiqueta descriptiva legible
    label: v.string(),
    labelEs: v.string(), // Etiqueta en español
    
    // Metadata adicional
    category: v.optional(v.string()), // ej: "sexo", "comuna", "gse"
    description: v.optional(v.string()),
    
    // Ordenamiento
    sortOrder: v.optional(v.number()),
    
    // Estado
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('worldId', ['worldId'])
    .index('worldId_field', ['worldId', 'field'])
    .index('worldId_field_code', ['worldId', 'field', 'code'])
    .index('category', ['category']),
};
