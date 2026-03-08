import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const pulsoTables = {
  // Encuestas
  surveys: defineTable({
    question: v.string(),
    context: v.optional(v.string()),
    options: v.array(v.string()),
    status: v.union(v.literal('draft'), v.literal('running'), v.literal('completed')),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    worldId: v.optional(v.id('worlds')),
  })
    .index('status', ['status'])
    .index('createdAt', ['createdAt']),

  // Respuestas de los agentes a las encuestas
  surveyResponses: defineTable({
    surveyId: v.id('surveys'),
    playerId: v.string(), // agentId como "a:1", "a:3", etc.
    playerName: v.string(),
    response: v.string(),
    createdAt: v.number(),
  })
    .index('surveyId', ['surveyId'])
    .index('playerId', ['playerId']),

  // Agentes del panel de encuestas (panelistas)
  panelAgents: defineTable({
    playerId: v.string(), // ID del jugador en el juego
    name: v.string(), // Nombre del agente
    age: v.number(), // Edad
    gse: v.string(), // Grupo Socioeconómico
    region: v.string(), // Región de Chile
    comuna: v.string(), // Comuna
    politicalLeaning: v.number(), // Inclinación política (1-10)
    interests: v.array(v.string()), // Intereses del agente
    worldId: v.id('worlds'), // ID del mundo al que pertenece
    x: v.number(), // Posición X en el mapa
    y: v.number(), // Posición Y en el mapa
    isVisible: v.boolean(), // Si es visible como embajador
  })
    .index('playerId', ['playerId'])
    .index('gse', ['gse'])
    .index('region', ['region'])
    .index('worldId', ['worldId']),
};
