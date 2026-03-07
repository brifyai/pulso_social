import { httpRouter } from 'convex/server';
import { handleReplicateWebhook } from './music';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

const http = httpRouter();

http.route({
  path: '/replicate_webhook',
  method: 'POST',
  handler: handleReplicateWebhook,
});

// Endpoint HTTP para carga masiva de agentes (sin autenticación para scripts)
http.route({
  path: '/api/bulkInsertAgents',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { agents, worldId } = body;
      
      if (!agents || !Array.isArray(agents)) {
        return new Response(
          JSON.stringify({ error: 'agents debe ser un array' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (!worldId) {
        return new Response(
          JSON.stringify({ error: 'worldId es requerido' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Validar que cada agente tenga los campos requeridos
      for (const agent of agents) {
        if (!agent.playerId || !agent.name || !agent.age || !agent.gse || 
            !agent.region || !agent.comuna || !agent.x || !agent.y) {
          return new Response(
            JSON.stringify({ error: 'Agente inválido: faltan campos requeridos' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // Llamar a la función interna para insertar los agentes
      const result = await ctx.runMutation(internal.pulso.agents.bulkInsertPanelAgentsInternal, {
        agents: agents.map(agent => ({
          ...agent,
          worldId,
        })),
      });
      
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('Error en bulkInsertAgents:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Error interno del servidor' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }),
});

// Endpoint HTTP para obtener el worldId por defecto
http.route({
  path: '/api/getDefaultWorldId',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    try {
      const worldId = await ctx.runQuery(internal.pulso.agents.getDefaultWorldIdInternal);
      return new Response(
        JSON.stringify({ worldId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('Error en getDefaultWorldId:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Error interno del servidor' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }),
});

export default http;
