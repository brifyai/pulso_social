import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { getSpawnPos, REGION_CENTERS } from './regions';

// Crear un agente con posición basada en su región
export const createAgent = mutation({
  args: {
    playerId: v.string(),
    name: v.string(),
    age: v.number(),
    gse: v.string(),
    region: v.string(),
    comuna: v.string(),
    politicalLeaning: v.number(),
    interests: v.array(v.string()),
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const pos = getSpawnPos(args.region);
    
    // Solo el 5% será visible para no saturar el mapa
    const isVisible = Math.random() < 0.05;
    
    const agentId = await ctx.db.insert('panelAgents', {
      ...args,
      isVisible,
      x: pos.x,
      y: pos.y,
    });
    
    return agentId;
  },
});

// Crear múltiples agentes en lote (para seed inicial)
export const createBatchAgents = mutation({
  args: {
    agents: v.array(
      v.object({
        playerId: v.string(),
        name: v.string(),
        age: v.number(),
        gse: v.string(),
        region: v.string(),
        comuna: v.string(),
        politicalLeaning: v.number(),
        interests: v.array(v.string()),
      })
    ),
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const createdIds = [];
    
    for (const agent of args.agents) {
      const pos = getSpawnPos(agent.region);
      const isVisible = Math.random() < 0.05;
      
      const agentId = await ctx.db.insert('panelAgents', {
        ...agent,
        worldId: args.worldId,
        isVisible,
        x: pos.x,
        y: pos.y,
      });
      
      createdIds.push(agentId);
    }
    
    return createdIds;
  },
});

// Obtener solo agentes visibles (embajadores)
export const listVisibleAgents = query({
  args: {
    worldId: v.optional(v.id('worlds')),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('panelAgents').filter((q) => q.eq(q.field('isVisible'), true));
    
    if (args.worldId) {
      query = query.filter((q) => q.eq(q.field('worldId'), args.worldId));
    }
    
    return await query.collect();
  },
});

// Obtener todos los agentes (para estadísticas)
export const listAllAgents = query({
  args: {
    worldId: v.optional(v.id('worlds')),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('panelAgents');
    
    if (args.worldId) {
      query = query.filter((q) => q.eq(q.field('worldId'), args.worldId));
    }
    
    return await query.collect();
  },
});

// Obtener agentes por región
export const listAgentsByRegion = query({
  args: {
    region: v.string(),
    worldId: v.optional(v.id('worlds')),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('panelAgents').filter((q) => q.eq(q.field('region'), args.region));
    
    if (args.worldId) {
      query = query.filter((q) => q.eq(q.field('worldId'), args.worldId));
    }
    
    return await query.collect();
  },
});

// Obtener estadísticas por región
export const getRegionStats = query({
  args: {
    worldId: v.optional(v.id('worlds')),
  },
  handler: async (ctx, args) => {
    const allAgents = await ctx.db.query('panelAgents').collect();
    
    const stats: Record<string, { total: number; visible: number }> = {};
    
    for (const agent of allAgents) {
      if (args.worldId && agent.worldId !== args.worldId) continue;
      
      if (!stats[agent.region]) {
        stats[agent.region] = { total: 0, visible: 0 };
      }
      
      stats[agent.region].total++;
      if (agent.isVisible) {
        stats[agent.region].visible++;
      }
    }
    
    return stats;
  },
});

// Obtener coordenadas de las regiones
export const getRegionCenters = query({
  args: {},
  handler: async () => {
    return REGION_CENTERS;
  },
});
