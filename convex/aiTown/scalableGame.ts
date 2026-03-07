/**
 * Motor de juego escalable por zonas
 * 
 * Este motor procesa cada zona de forma independiente, permitiendo escalar
 * a miles de agentes sin exceder los límites de Convex.
 * 
 * Arquitectura:
 * - Cada zona tiene su propio motor independiente
 * - Los agentes solo se procesan cuando están en zonas activas
 * - Los jugadores pueden interactuar con agentes en su zona actual
 * - Sistema de activación por proximidad para agentes
 */

import { v } from 'convex/values';
import { mutation, query, action } from '../_generated/server';
import { Id, Doc } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import {
  ActionCtx,
  DatabaseReader,
  internalMutation,
  internalQuery,
} from '../_generated/server';

// ============================================================================
// CONFIGURACIÓN DEL MOTOR
// ============================================================================

export const SCALABLE_CONFIG = {
  // Límites por zona
  maxAgentsPerZone: 500,
  maxPlayersPerZone: 50,
  maxConversationsPerZone: 100,
  
  // Tiempos del motor
  tickDuration: 16, // ms por tick
  stepDuration: 1000, // ms por paso
  maxTicksPerStep: 600,
  maxInputsPerStep: 128,
  
  // Sistema de activación
  activationDistance: 100, // distancia para activar agentes
  idleTimeout: 30000, // ms antes de que un agente se vuelva idle
  activationDuration: 60000, // ms que un agente permanece activo después de activarse
  
  // Límites de procesamiento
  maxAgentOperationsPerTick: 10,
  maxPathfindsPerTick: 20,
};

// ============================================================================
// CLASE DEL MOTOR ESCALABLE
// ============================================================================

export class ScalableGame {
  zoneId: Id<'zones'>;
  worldId: Id<'worlds'>;
  now: number;
  
  // Estado de la zona
  agents: Array<Doc<'agents'>> = [];
  players: Array<Doc<'players'>> = [];
  conversations: Array<Doc<'conversations'>> = [];
  zone: Doc<'zones'> | null = null;
  
  // Operaciones pendientes
  pendingOperations: Array<{ name: string; args: any }> = [];
  
  // Contadores de rendimiento
  stats = {
    agentsProcessed: 0,
    playersProcessed: 0,
    conversationsProcessed: 0,
    pathfinds: 0,
    operations: 0,
  };

  constructor(zoneId: Id<'zones'>, worldId: Id<'worlds'>, now: number) {
    this.zoneId = zoneId;
    this.worldId = worldId;
    this.now = now;
  }

  /**
   * Carga el estado de la zona desde la base de datos
   */
  static async load(
    db: DatabaseReader,
    zoneId: Id<'zones'>,
  ): Promise<ScalableGame> {
    const zone = await db.get(zoneId);
    if (!zone) {
      throw new Error(`Zona no encontrada: ${zoneId}`);
    }

    const now = Date.now();
    const game = new ScalableGame(zoneId, zone.worldId, now);
    game.zone = zone;

    // Cargar agentes de la zona
    game.agents = await db
      .query('agents')
      .withIndex('zoneId', (q) => q.eq('zoneId', zoneId))
      .collect();

    // Cargar jugadores de la zona
    game.players = await db
      .query('players')
      .withIndex('zoneId', (q) => q.eq('zoneId', zoneId))
      .collect();

    // Cargar conversaciones de la zona
    game.conversations = await db
      .query('conversations')
      .withIndex('zoneId', (q) => q.eq('zoneId', zoneId))
      .collect();

    return game;
  }

  /**
   * Procesa un tick del motor para esta zona
   */
  async tick(ctx: ActionCtx): Promise<void> {
    const now = Date.now();
    this.now = now;

    // Procesar jugadores
    for (const player of this.players) {
      await this.processPlayer(ctx, player);
      this.stats.playersProcessed++;
    }

    // Procesar agentes activos
    for (const agent of this.agents) {
      if (agent.status === 'active') {
        await this.processAgent(ctx, agent);
        this.stats.agentsProcessed++;
      }
    }

    // Procesar conversaciones
    for (const conversation of this.conversations) {
      await this.processConversation(ctx, conversation);
      this.stats.conversationsProcessed++;
    }

    // Actualizar estadísticas de la zona
    await this.updateZoneStats(ctx);
  }

  /**
   * Procesa un jugador individual
   */
  private async processPlayer(ctx: ActionCtx, player: Doc<'players'>): Promise<void> {
    // Verificar si el jugador entró en una nueva zona
    const newZoneId = await this.findZoneForPosition(
      ctx,
      player.position.x,
      player.position.y
    );
    
    if (newZoneId && newZoneId !== this.zoneId) {
      await this.transferPlayerToZone(ctx, player, newZoneId);
    }

    // Activar agentes cercanos
    await this.activateNearbyAgents(ctx, player);
  }

  /**
   * Procesa un agente individual
   */
  private async processAgent(ctx: ActionCtx, agent: Doc<'agents'>): Promise<void> {
    const now = Date.now();

    // Verificar timeout de inactividad
    if (agent.lastActive && now - agent.lastActive > SCALABLE_CONFIG.activationDuration) {
      await this.deactivateAgent(ctx, agent);
      return;
    }

    // Ejecutar operación del agente si existe
    if (agent.inProgressOperation) {
      // Lógica de operación aquí
    }
  }

  /**
   * Procesa una conversación individual
   */
  private async processConversation(ctx: ActionCtx, conversation: Doc<'conversations'>): Promise<void> {
    // Verificar si la conversación está vacía
    const activeParticipants = conversation.participants.filter(
      p => !p.leftAt
    );

    if (activeParticipants.length < 2) {
      await this.endConversation(ctx, conversation);
    }
  }

  /**
   * Activa agentes cercanos a un jugador
   */
  private async activateNearbyAgents(ctx: ActionCtx, player: Doc<'players'>): Promise<void> {
    const activationDistance = SCALABLE_CONFIG.activationDistance;
    
    for (const agent of this.agents) {
      if (agent.status === 'idle') {
        const distance = this.calculateDistance(
          player.position,
          agent.position
        );

        if (distance < activationDistance) {
          await this.activateAgent(ctx, agent);
        }
      }
    }
  }

  /**
   * Activa un agente
   */
  private async activateAgent(ctx: ActionCtx, agent: Doc<'agents'>): Promise<void> {
    await ctx.runMutation(internal.aiTown.scalableGame.activateAgent as any, {
      agentId: agent._id,
      now: Date.now(),
    });
  }

  /**
   * Desactiva un agente
   */
  private async deactivateAgent(ctx: ActionCtx, agent: Doc<'agents'>): Promise<void> {
    await ctx.runMutation(internal.aiTown.scalableGame.deactivateAgent as any, {
      agentId: agent._id,
    });
  }

  /**
   * Transfiere un jugador a otra zona
   */
  private async transferPlayerToZone(
    ctx: ActionCtx,
    player: Doc<'players'>,
    newZoneId: Id<'zones'>
  ): Promise<void> {
    await ctx.runMutation(internal.aiTown.scalableGame.transferPlayer as any, {
      playerId: player._id,
      newZoneId,
    });
  }

  /**
   * Termina una conversación
   */
  private async endConversation(ctx: ActionCtx, conversation: Doc<'conversations'>): Promise<void> {
    await ctx.runMutation(internal.aiTown.scalableGame.endConversation as any, {
      conversationId: conversation._id,
    });
  }

  /**
   * Calcula la distancia entre dos posiciones
   */
  private calculateDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number }
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Encuentra la zona para una posición dada
   */
  private async findZoneForPosition(
    ctx: ActionCtx,
    x: number,
    y: number
  ): Promise<Id<'zones'> | null> {
    const zones = await ctx.runQuery(internal.aiTown.scalableGame.getZonesForWorld as any, {
      worldId: this.worldId,
    });

    for (const zone of zones) {
      const bounds = zone.bounds;
      if (
        x >= bounds.x &&
        x < bounds.x + bounds.width &&
        y >= bounds.y &&
        y < bounds.y + bounds.height
      ) {
        return zone._id;
      }
    }

    return zones.length > 0 ? zones[0]._id : null;
  }

  /**
   * Actualiza las estadísticas de la zona
   */
  private async updateZoneStats(ctx: ActionCtx): Promise<void> {
    if (!this.zone) return;

    const activeAgents = this.agents.filter(a => a.status === 'active').length;
    const idleAgents = this.agents.filter(a => a.status === 'idle').length;

    await ctx.runMutation(internal.aiTown.scalableGame.updateZoneStats as any, {
      zoneId: this.zoneId,
      activeAgentsCount: activeAgents,
      idleAgentsCount: idleAgents,
      playersCount: this.players.length,
    });
  }
}

// ============================================================================
// FUNCIONES DE EJECUCIÓN DEL MOTOR
// ============================================================================

/**
 * Acción para procesar un tick de una zona específica
 */
export const processZoneTick = action({
  args: {
    zoneId: v.id('zones'),
  },
  handler: async (ctx, args) => {
    try {
      const zone = await ctx.runQuery(internal.aiTown.scalableGame.getZone as any, {
        zoneId: args.zoneId,
      });

      if (!zone || !zone.isActive) {
        return { processed: false, reason: 'Zona no encontrada o inactiva' };
      }

      // Cargar datos usando runQuery en lugar de ctx.db
      const agents = await ctx.runQuery(internal.aiTown.scalableGame.getAgentsInZone as any, {
        zoneId: args.zoneId,
      });
      const players = await ctx.runQuery(internal.aiTown.scalableGame.getPlayersInZone as any, {
        zoneId: args.zoneId,
      });
      const conversations = await ctx.runQuery(internal.aiTown.scalableGame.getConversationsInZone as any, {
        zoneId: args.zoneId,
      });

      const now = Date.now();
      const game = new ScalableGame(args.zoneId, zone.worldId, now);
      game.zone = zone;
      game.agents = agents;
      game.players = players;
      game.conversations = conversations;

      await game.tick(ctx);

      return {
        processed: true,
        stats: game.stats,
      };
    } catch (error) {
      console.error(`Error procesando zona ${args.zoneId}:`, error);
      return { processed: false, error: String(error) };
    }
  },
});

/**
 * Acción para procesar todas las zonas activas
 */
export const processAllActiveZones = action({
  args: {},
  handler: async (ctx) => {
    const worldStatus = await ctx.runQuery(internal.aiTown.scalableGame.getDefaultWorld as any, {});
    
    if (!worldStatus) {
      return { processed: 0, error: 'No se encontró el mundo por defecto' };
    }

    const zones = await ctx.runQuery(internal.aiTown.scalableGame.getActiveZones, {
      worldId: worldStatus.worldId,
    });

    const results = [];
    for (const zone of zones) {
      const result = await processZoneTick(ctx, { zoneId: zone._id });
      results.push({ zoneId: zone._id, ...result });
    }

    return {
      processed: results.filter(r => r.processed).length,
      total: zones.length,
      results,
    };
  },
});

// ============================================================================
// QUERIES INTERNAS
// ============================================================================

// ============================================================================
// QUERIES INTERNAS
// ============================================================================

export const getZone = internalQuery({
  args: {
    zoneId: v.id('zones'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.zoneId);
  },
});

export const getZonesForWorld = internalQuery({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('zones')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
  },
});

export const getActiveZones = internalQuery({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('zones')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();
  },
});

export const getDefaultWorld = internalQuery({
  args: {},
  handler: async (ctx, _args) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    return worldStatus ? { worldId: worldStatus.worldId } : null;
  },
});

export const getAgentsInZone = internalQuery({
  args: {
    zoneId: v.id('zones'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agents')
      .withIndex('zoneId', (q) => q.eq('zoneId', args.zoneId))
      .collect();
  },
});

export const getPlayersInZone = internalQuery({
  args: {
    zoneId: v.id('zones'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('players')
      .withIndex('zoneId', (q) => q.eq('zoneId', args.zoneId))
      .collect();
  },
});

export const getConversationsInZone = internalQuery({
  args: {
    zoneId: v.id('zones'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('conversations')
      .withIndex('zoneId', (q) => q.eq('zoneId', args.zoneId))
      .collect();
  },
});

// ============================================================================
// MUTACIONES INTERNAS
// ============================================================================

export const activateAgent = internalMutation({
  args: {
    agentId: v.id('agents'),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return;

    await ctx.db.patch(args.agentId, {
      status: 'active',
      lastActive: args.now,
      updatedAt: args.now,
    });
  },
});

export const deactivateAgent = internalMutation({
  args: {
    agentId: v.id('agents'),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return;

    await ctx.db.patch(args.agentId, {
      status: 'idle',
      updatedAt: Date.now(),
    });
  },
});

export const transferPlayer = internalMutation({
  args: {
    playerId: v.id('players'),
    newZoneId: v.id('zones'),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return;

    // Actualizar jugador a nueva zona
    await ctx.db.patch(args.playerId, {
      zoneId: args.newZoneId,
      enteredZoneAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const endConversation = internalMutation({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    await ctx.db.patch(args.conversationId, {
      status: 'ended',
      updatedAt: Date.now(),
    });
  },
});

export const updateZoneStats = internalMutation({
  args: {
    zoneId: v.id('zones'),
    activeAgentsCount: v.number(),
    idleAgentsCount: v.number(),
    playersCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.zoneId, {
      activeAgentsCount: args.activeAgentsCount,
      idleAgentsCount: args.idleAgentsCount,
      playersCount: args.playersCount,
    });
  },
});

// ============================================================================
// QUERY DE ESTADO DEL MOTOR
// ============================================================================

export const getEngineStatus = query({
  args: {},
  handler: async (ctx) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      return { error: 'No se encontró el mundo por defecto' };
    }

    const zones = await ctx.db
      .query('zones')
      .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
      .collect();

    const totalAgents = await ctx.db.query('agents').collect();
    const totalPlayers = await ctx.db.query('players').collect();
    const totalConversations = await ctx.db.query('conversations').collect();

    const activeAgents = totalAgents.filter(a => a.status === 'active');
    const idleAgents = totalAgents.filter(a => a.status === 'idle');

    return {
      worldId: worldStatus.worldId,
      zones: {
        total: zones.length,
        active: zones.filter(z => z.isActive).length,
      },
      agents: {
        total: totalAgents.length,
        active: activeAgents.length,
        idle: idleAgents.length,
      },
      players: {
        total: totalPlayers.length,
      },
      conversations: {
        total: totalConversations.length,
        active: totalConversations.filter(c => c.status === 'active').length,
      },
      config: SCALABLE_CONFIG,
    };
  },
});