import { query, mutation, internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { getSpawnPos } from './regions';

// ==================== SURVEYS (ENCUESTAS) ====================

// Listar todas las encuestas
export const listSurveys = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('surveys').order('desc').collect();
  },
});

// Obtener una encuesta por ID
export const getSurvey = query({
  args: { id: v.id('surveys') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Crear una nueva encuesta
export const createSurvey = mutation({
  args: {
    question: v.string(),
    context: v.optional(v.string()),
    options: v.array(v.string()),
    status: v.union(v.literal('draft'), v.literal('running'), v.literal('completed')),
    worldId: v.optional(v.id('worlds')),
  },
  handler: async (ctx, args) => {
    const surveyId = await ctx.db.insert('surveys', {
      question: args.question,
      context: args.context,
      options: args.options,
      status: args.status,
      createdAt: Date.now(),
      worldId: args.worldId,
    });
    return surveyId;
  },
});

// Actualizar estado de una encuesta
export const updateSurveyStatus = mutation({
  args: {
    id: v.id('surveys'),
    status: v.union(v.literal('draft'), v.literal('running'), v.literal('completed')),
  },
  handler: async (ctx, args) => {
    const updates: any = { status: args.status };
    if (args.status === 'completed') {
      updates.completedAt = Date.now();
    }
    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Eliminar una encuesta
export const deleteSurvey = mutation({
  args: { id: v.id('surveys') },
  handler: async (ctx, args) => {
    // Eliminar primero las respuestas asociadas
    const responses = await ctx.db
      .query('surveyResponses')
      .withIndex('surveyId', (q) => q.eq('surveyId', args.id))
      .collect();
    
    for (const response of responses) {
      await ctx.db.delete(response._id);
    }
    
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ==================== SURVEY RESPONSES (RESPUESTAS) ====================

// Obtener respuestas de una encuesta
export const getSurveyResponses = query({
  args: { surveyId: v.id('surveys') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('surveyResponses')
      .withIndex('surveyId', (q) => q.eq('surveyId', args.surveyId))
      .collect();
  },
});

// Agregar una respuesta a una encuesta
export const addSurveyResponse = mutation({
  args: {
    surveyId: v.id('surveys'),
    playerId: v.string(),
    playerName: v.string(),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    const responseId = await ctx.db.insert('surveyResponses', {
      surveyId: args.surveyId,
      playerId: args.playerId,
      playerName: args.playerName,
      response: args.response,
      createdAt: Date.now(),
    });
    return responseId;
  },
});

// Obtener estadísticas de una encuesta
export const getSurveyStats = query({
  args: { surveyId: v.id('surveys') },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) return null;

    const responses = await ctx.db
      .query('surveyResponses')
      .withIndex('surveyId', (q) => q.eq('surveyId', args.surveyId))
      .collect();

    // Contar respuestas por opción
    const optionCounts: Record<string, number> = {};
    survey.options.forEach(opt => {
      optionCounts[opt] = 0;
    });
    
    responses.forEach(r => {
      if (optionCounts[r.response] !== undefined) {
        optionCounts[r.response]++;
      }
    });

    // Calcular porcentajes
    const total = responses.length;
    const percentages: Record<string, number> = {};
    Object.keys(optionCounts).forEach(opt => {
      percentages[opt] = total > 0 ? Math.round((optionCounts[opt] / total) * 100) : 0;
    });

    return {
      survey,
      totalResponses: total,
      optionCounts,
      percentages,
    };
  },
});

// ==================== PANEL AGENTS (AGENTES DEL PANEL) ====================

// Listar todos los agentes del panel
export const listPanelAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('panelAgents').collect();
  },
});

// Obtener agente del panel por playerId
export const getPanelAgent = query({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query('panelAgents')
      .withIndex('playerId', (q) => q.eq('playerId', args.playerId))
      .collect();
    return agents[0] || null;
  },
});

// Crear un agente del panel
export const createPanelAgent = mutation({
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
    const isVisible = Math.random() < 0.05; // Solo 5% visible
    
    const agentId = await ctx.db.insert('panelAgents', {
      playerId: args.playerId,
      name: args.name,
      age: args.age,
      gse: args.gse,
      region: args.region,
      comuna: args.comuna,
      politicalLeaning: args.politicalLeaning,
      interests: args.interests,
      worldId: args.worldId,
      x: pos.x,
      y: pos.y,
      isVisible,
    });
    return agentId;
  },
});

// Actualizar un agente del panel
export const updatePanelAgent = mutation({
  args: {
    id: v.id('panelAgents'),
    age: v.optional(v.number()),
    gse: v.optional(v.string()),
    region: v.optional(v.string()),
    comuna: v.optional(v.string()),
    politicalLeaning: v.optional(v.number()),
    interests: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Eliminar un agente del panel
export const deletePanelAgent = mutation({
  args: { id: v.id('panelAgents') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Obtener agentes por GSE
export const getPanelAgentsByGSE = query({
  args: { gse: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('panelAgents')
      .withIndex('gse', (q) => q.eq('gse', args.gse))
      .collect();
  },
});

// Obtener agentes por región
export const getPanelAgentsByRegion = query({
  args: { region: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('panelAgents')
      .withIndex('region', (q) => q.eq('region', args.region))
      .collect();
  },
});

// ==================== DASHBOARD STATS ====================

// Obtener estadísticas generales para el dashboard
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    // Contar encuestas por estado
    const allSurveys = await ctx.db.query('surveys').collect();
    const draftSurveys = allSurveys.filter(s => s.status === 'draft');
    const runningSurveys = allSurveys.filter(s => s.status === 'running');
    const completedSurveys = allSurveys.filter(s => s.status === 'completed');

    // Contar agentes del panel
    const allAgents = await ctx.db.query('panelAgents').collect();

    // Contar respuestas totales
    const allResponses = await ctx.db.query('surveyResponses').collect();

    return {
      totalSurveys: allSurveys.length,
      draftSurveys: draftSurveys.length,
      runningSurveys: runningSurveys.length,
      completedSurveys: completedSurveys.length,
      totalPanelAgents: allAgents.length,
      totalResponses: allResponses.length,
    };
  },
});

// ==================== INTERNAL MUTATIONS (Para usar desde actions) ====================

// Guardar un voto de encuesta
export const saveSurveyVote = internalMutation({
  args: {
    surveyId: v.id('surveys'),
    playerId: v.string(),
    playerName: v.string(),
    response: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('surveyResponses', {
      surveyId: args.surveyId,
      playerId: args.playerId,
      playerName: args.playerName,
      response: args.response,
      createdAt: Date.now(),
    });
  },
});

// Marcar encuesta como completada
export const completeSurvey = internalMutation({
  args: { surveyId: v.id('surveys') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.surveyId, {
      status: 'completed',
      completedAt: Date.now(),
    });
  },
});

// ==================== AGENTES VISUALES (EMBAJADORES) ====================

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
    const { REGION_CENTERS } = await import('./regions');
    return REGION_CENTERS;
  },
});

// ==================== NEWS (NOTICIAS - SUPABASE INTEGRATION) ====================

// Re-exportar funciones de noticias desde news.ts
export {
  getChileanNews,
  searchRelevantNews,
  getNewsContextForAgent,
  generateTextEmbedding
} from './news';