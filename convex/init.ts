import { v } from 'convex/values';
import { internal } from './_generated/api';
import { DatabaseReader, MutationCtx, mutation } from './_generated/server';
import { Descriptions } from '../data/characters';
import * as map from '../data/gentle';
import { insertInput } from './aiTown/insertInput';
import { Id } from './_generated/dataModel';
import { createEngine } from './aiTown/main';
import { ENGINE_ACTION_DURATION } from './constants';
import { detectMismatchedLLMProvider } from './util/llm';

const init = mutation({
  args: {
    numAgents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    detectMismatchedLLMProvider();
    const { worldStatus, engine } = await getOrCreateDefaultWorld(ctx);
    if (worldStatus.status !== 'running') {
      console.warn(
        `Engine ${engine._id} is not active! Run "npx convex run testing:resume" to restart it.`,
      );
      return;
    }
    const shouldCreate = await shouldCreateAgents(
      ctx.db,
      worldStatus.worldId,
      worldStatus.engineId,
    );
    if (shouldCreate) {
      const toCreate = args.numAgents !== undefined ? args.numAgents : Descriptions.length;
      for (let i = 0; i < toCreate; i++) {
        await insertInput(ctx, worldStatus.worldId, 'createAgent', {
          descriptionIndex: i % Descriptions.length,
        });
      }
    }
  },
});
export default init;

// Mutation para actualizar las descripciones de los agentes desde data/characters.ts
export const updateAgentDescriptions = mutation({
  args: {},
  handler: async (ctx) => {
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .unique();
    
    if (!worldStatus) {
      throw new Error('No se encontró el mundo por defecto');
    }
    
    // Obtener todas las descripciones de agentes actuales
    const agentDescriptions = await ctx.db
      .query('agentDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
      .collect();
    
    // Obtener las descripciones de jugadores para encontrar los nombres
    const playerDescriptions = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
      .collect();
    
    // Crear un mapa de nombres a descripciones
    const nameToDesc = new Map<string, typeof Descriptions[0]>();
    Descriptions.forEach((desc) => {
      nameToDesc.set(desc.name, desc);
    });
    
    let updated = 0;
    
    // Crear un mapa de nombres de agentes a sus descripciones en español
    // Los nombres en la base de datos son: Lucky, Bob, Stella, Alice, Pete
    const agentNames = ['Lucky', 'Bob', 'Stella', 'Alice', 'Pete'];
    
    // Actualizar cada descripción de agente buscando por nombre en el identity
    for (const agentDesc of agentDescriptions) {
      // Buscar qué nombre de agente coincide con el identity actual
      const matchedName = agentNames.find(name =>
        agentDesc.identity.toLowerCase().includes(name.toLowerCase())
      );
      
      if (matchedName && nameToDesc.has(matchedName)) {
        const newDesc = nameToDesc.get(matchedName)!;
        await ctx.db.patch(agentDesc._id, {
          identity: newDesc.identity,
          plan: newDesc.plan,
        });
        console.log(`Actualizado agente ${matchedName} con descripción en español`);
        updated++;
      } else {
        console.log(`No se encontró coincidencia para agentId: ${agentDesc.agentId}, identity: ${agentDesc.identity.substring(0, 50)}...`);
      }
    }
    
    // También actualizar las playerDescriptions
    let playerUpdated = 0;
    for (const playerDesc of playerDescriptions) {
      // Ignorar el jugador humano (Me)
      if (playerDesc.name === 'Me') {
        continue;
      }
      
      if (nameToDesc.has(playerDesc.name)) {
        const newDesc = nameToDesc.get(playerDesc.name)!;
        await ctx.db.patch(playerDesc._id, {
          description: newDesc.identity,
        });
        console.log(`Actualizado playerDescription ${playerDesc.name} con descripción en español`);
        playerUpdated++;
      }
    }
    
    return { success: true, updated, playerUpdated };
  },
});

async function getOrCreateDefaultWorld(ctx: MutationCtx) {
  const now = Date.now();

  let worldStatus = await ctx.db
    .query('worldStatus')
    .filter((q) => q.eq(q.field('isDefault'), true))
    .unique();
  if (worldStatus) {
    const engine = (await ctx.db.get(worldStatus.engineId))!;
    return { worldStatus, engine };
  }

  const engineId = await createEngine(ctx);
  const engine = (await ctx.db.get(engineId))!;
  const worldId = await ctx.db.insert('worlds', {
    nextId: 0,
    agents: [],
    conversations: [],
    players: [],
  });
  const worldStatusId = await ctx.db.insert('worldStatus', {
    engineId: engineId,
    isDefault: true,
    lastViewed: now,
    status: 'running',
    worldId: worldId,
  });
  worldStatus = (await ctx.db.get(worldStatusId))!;
  await ctx.db.insert('maps', {
    worldId,
    width: map.mapwidth,
    height: map.mapheight,
    tileSetUrl: map.tilesetpath,
    tileSetDimX: map.tilesetpxw,
    tileSetDimY: map.tilesetpxh,
    tileDim: map.tiledim,
    bgTiles: map.bgtiles,
    objectTiles: map.objmap,
    animatedSprites: map.animatedsprites,
  });
  await ctx.scheduler.runAfter(0, internal.aiTown.main.runStep, {
    worldId,
    generationNumber: engine.generationNumber,
    maxDuration: ENGINE_ACTION_DURATION,
  });
  return { worldStatus, engine };
}

async function shouldCreateAgents(
  db: DatabaseReader,
  worldId: Id<'worlds'>,
  engineId: Id<'engines'>,
) {
  const world = await db.get(worldId);
  if (!world) {
    throw new Error(`Invalid world ID: ${worldId}`);
  }
  if (world.agents.length > 0) {
    return false;
  }
  const unactionedJoinInputs = await db
    .query('inputs')
    .withIndex('byInputNumber', (q) => q.eq('engineId', engineId))
    .order('asc')
    .filter((q) => q.eq(q.field('name'), 'createAgent'))
    .filter((q) => q.eq(q.field('returnValue'), undefined))
    .first();
  if (unactionedJoinInputs) {
    return false;
  }
  return true;
}
