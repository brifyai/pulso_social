/**
 * Funciones de migración para la arquitectura escalable
 * 
 * Estas funciones migran los datos del documento worlds a las tablas separadas
 */

import { v } from 'convex/values';
import { mutation, query, internalMutation, action } from '../_generated/server';
import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';

// ============================================================================
// QUERIES DE ESTADO
// ============================================================================

/**
 * Query para verificar el estado actual de la migración
 */
export const getMigrationStatus = query({
  args: {},
  handler: async (ctx) => {
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      return { error: 'No se encontró el mundo por defecto' };
    }

    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      return { error: 'No se encontró el mundo' };
    }

    // Contar elementos en el documento worlds
    const worldsAgentsCount = world.agents.length;
    const worldsPlayersCount = world.players.length;
    const worldsConversationsCount = world.conversations.length;

    // Contar elementos en las nuevas tablas
    const scalableAgentsCount = await ctx.db.query('agents').collect();
    const scalablePlayersCount = await ctx.db.query('players').collect();
    const scalableConversationsCount = await ctx.db.query('conversations').collect();
    const zonesCount = await ctx.db.query('zones').collect();

    return {
      worldId: worldStatus.worldId,
      worlds: {
        agents: worldsAgentsCount,
        players: worldsPlayersCount,
        conversations: worldsConversationsCount,
      },
      scalable: {
        agents: scalableAgentsCount.length,
        players: scalablePlayersCount.length,
        conversations: scalableConversationsCount.length,
        zones: zonesCount.length,
      },
      migrationProgress: {
        agents: worldsAgentsCount > 0 
          ? Math.round((scalableAgentsCount.length / worldsAgentsCount) * 100) 
          : 0,
        players: worldsPlayersCount > 0 
          ? Math.round((scalablePlayersCount.length / worldsPlayersCount) * 100) 
          : 0,
        conversations: worldsConversationsCount > 0 
          ? Math.round((scalableConversationsCount.length / worldsConversationsCount) * 100) 
          : 0,
      },
    };
  },
});

// ============================================================================
// FUNCIONES PARA CARGAR 10,000 AGENTES DESDE JSON
// ============================================================================

/**
 * Mutación INTERNA para cargar agentes desde un array de datos
 * Sin autenticación para uso con scripts locales
 * Acepta cualquier campo y filtra internamente
 */
export const load10kAgentsInternal = internalMutation({
  args: {
    agents: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 Cargando ${args.agents.length} agentes en arquitectura escalable...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      throw new Error('No se encontró el mundo por defecto');
    }

    // Obtener zonas
    const zones = await ctx.db
      .query('zones')
      .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
      .collect();
    
    if (zones.length === 0) {
      throw new Error('No hay zonas creadas. Ejecuta createZones primero.');
    }

    const now = Date.now();
    let loaded = 0;
    let skipped = 0;

    // Procesar solo 100 agentes por ejecución para evitar límites
    const maxAgents = Math.min(args.agents.length, 100);
    
    for (let i = 0; i < maxAgents; i++) {
      const agent = args.agents[i];
      
      // Verificar si ya existe
      const existing = await ctx.db
        .query('agents')
        .withIndex('playerId', (q) => q.eq('playerId', agent.playerId))
        .first();
      
      if (existing) {
        skipped++;
        continue;
      }

      // Encontrar zona basada en posición
      let zoneId = zones[0]._id;
      for (const zone of zones) {
        if (
          agent.x >= zone.bounds.x &&
          agent.x < zone.bounds.x + zone.bounds.width &&
          agent.y >= zone.bounds.y &&
          agent.y < zone.bounds.y + zone.bounds.height
        ) {
          zoneId = zone._id;
          break;
        }
      }

      // Crear descripción del agente
      const identity = `${agent.name} es una persona de ${agent.age} años de ${agent.comuna}, ${agent.region}. GSE: ${agent.gse}.`;
      const plan = `${agent.name} está explorando aiTown. Intereses: ${agent.interests.slice(0, 3).join(', ')}.`;

      // Crear el agente en la tabla escalable
      const agentId = `a:${agent.playerId.split(':')[1]}`;
      await ctx.db.insert('agents', {
        worldId: worldStatus.worldId,
        zoneId,
        playerId: agent.playerId,
        name: agent.name,
        position: { x: agent.x, y: agent.y },
        facing: { dx: 0, dy: -1 },
        status: 'idle' as const,
        lastActive: now,
        createdAt: now,
        updatedAt: now,
        inProgressOperation: undefined,
        lastConversation: undefined,
        lastInviteAttempt: undefined,
        toRemember: undefined,
        agentData: {
          age: agent.age,
          sex: agent.sex,
          region: agent.region,
          comuna: agent.comuna,
          gse: agent.gse,
          politicalLeaning: agent.politicalLeaning,
          interests: agent.interests,
          escolaridad: agent.escolaridad,
          sit_fuerza_trabajo: agent.sit_fuerza_trabajo,
          p23_est_civil: agent.p23_est_civil,
        },
      });

      // Crear descripción del agente (sin playerId porque no está en el schema)
      await ctx.db.insert('agentDescriptions', {
        worldId: worldStatus.worldId,
        agentId,
        identity,
        plan,
      });

      loaded++;
    }

    console.log(`✓ ${loaded} agentes cargados, ${skipped} saltados`);

    return {
      loaded,
      skipped,
      total: loaded,
      remaining: args.agents.length - loaded - skipped,
    };
  },
});

/**
 * Mutación PÚBLICA para cargar agentes en arquitectura escalable
 * Acepta cualquier campo (los campos extra se ignoran)
 */
export const load10kAgents = mutation({
  args: {
    agents: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(internal.aiTown.scalableMigration.load10kAgentsInternal, {
      agents: args.agents,
    });
  },
});

/**
 * Query para contar agentes en la tabla escalable
 * Usa un enfoque simple con take(10000) para obtener el conteo aproximado
 */
export const countScalableAgents = query({
  args: {},
  handler: async (ctx) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      return { error: 'No se encontró el mundo por defecto', count: 0 };
    }

    // Usar take con un número grande para obtener todos los agentes
    // Convex permite take hasta 10000 en una sola query
    const agents = await ctx.db.query('agents').take(10000);
    
    return {
      count: agents.length,
      worldId: worldStatus.worldId,
      hasMore: agents.length === 10000,
    };
  },
});

/**
 * Query para obtener el estado completo de la migración escalable
 */
export const getScalableMigrationStatus = query({
  args: {},
  handler: async (ctx) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      return { error: 'No se encontró el mundo por defecto' };
    }

    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      return { error: 'No se encontró el mundo' };
    }

    const zones = await ctx.db.query('zones').take(100);
    const agents = await ctx.db.query('agents').take(1000);
    const players = await ctx.db.query('players').take(100);
    const conversations = await ctx.db.query('conversations').take(100);

    return {
      worldId: worldStatus.worldId,
      worlds: {
        agents: world.agents.length,
        players: world.players.length,
        conversations: world.conversations.length,
      },
      scalable: {
        zones: zones.length,
        agents: agents.length,
        players: players.length,
        conversations: conversations.length,
      },
      hasMoreAgents: agents.length === 1000,
      hasMorePlayers: players.length === 100,
      hasMoreConversations: conversations.length === 100,
    };
  },
});

/**
 * Mutación para limpiar el documento worlds (dejar solo 1 player)
 */
export const clearWorldsDocument = mutation({
  args: {},
  handler: async (ctx) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      throw new Error('No se encontró el mundo por defecto');
    }

    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      throw new Error('No se encontró el mundo');
    }

    // Guardar solo el primer player (tú)
    const firstPlayer = world.players[0];
    const firstAgent = world.agents[0];
    
    const cleanedWorld = {
      ...world,
      players: firstPlayer ? [firstPlayer] : [],
      agents: firstAgent ? [firstAgent] : [],
      conversations: [],
    };

    await ctx.db.replace(world._id, cleanedWorld);

    return {
      playersRemaining: cleanedWorld.players.length,
      agentsRemaining: cleanedWorld.agents.length,
      conversationsRemaining: cleanedWorld.conversations.length,
    };
  },
});

/**
 * Query para verificar si ya existen zonas creadas
 */
export const getZonesStatus = query({
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

    return {
      worldId: worldStatus.worldId,
      zonesCount: zones.length,
      zones: zones.map(z => ({
        id: z._id,
        name: z.name,
        isActive: z.isActive,
        bounds: z.bounds,
        activeAgentsCount: z.activeAgentsCount,
        idleAgentsCount: z.idleAgentsCount,
        playersCount: z.playersCount,
      })),
    };
  },
});

// ============================================================================
// MUTACIONES DE MIGRACIÓN
// ============================================================================

/**
 * Mutación para crear zonas basadas en la distribución de agentes
 * Divide el mapa en una cuadrícula de zonas
 */
export const createZones = mutation({
  args: {
    gridSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      throw new Error('No se encontró el mundo por defecto');
    }

    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      throw new Error('No se encontró el mundo');
    }

    const gridSize = args.gridSize || 4;
    
    const map = await ctx.db
      .query('maps')
      .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
      .unique();
    
    if (!map) {
      throw new Error('No se encontró el mapa');
    }

    const mapWidth = map.width;
    const mapHeight = map.height;
    const zoneWidth = Math.ceil(mapWidth / gridSize);
    const zoneHeight = Math.ceil(mapHeight / gridSize);

    let created = 0;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const name = `Zona ${String.fromCharCode(65 + row)}${col + 1}`;
        
        const existing = await ctx.db
          .query('zones')
          .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
          .filter((q) => q.eq(q.field('name'), name))
          .first();
        
        if (existing) {
          continue;
        }

        await ctx.db.insert('zones', {
          worldId: worldStatus.worldId,
          name,
          description: `Zona ${name} del mundo virtual`,
          bounds: {
            x: col * zoneWidth,
            y: row * zoneHeight,
            width: zoneWidth,
            height: zoneHeight,
          },
          maxAgents: 1000,
          maxPlayers: 100,
          isActive: true,
          activeAgentsCount: 0,
          idleAgentsCount: 0,
          playersCount: 0,
        });
        
        created++;
      }
    }

    return {
      created,
      gridSize,
      totalZones: gridSize * gridSize,
      zoneSize: { width: zoneWidth, height: zoneHeight },
    };
  },
});

/**
 * Mutación para encontrar la zona de una posición dada
 */
function findZoneForPosition(
  x: number,
  y: number,
  zones: Array<{ _id: Id<'zones'>; bounds: { x: number; y: number; width: number; height: number } }>
): Id<'zones'> | null {
  for (const zone of zones) {
    if (
      x >= zone.bounds.x &&
      x < zone.bounds.x + zone.bounds.width &&
      y >= zone.bounds.y &&
      y < zone.bounds.y + zone.bounds.height
    ) {
      return zone._id;
    }
  }
  return zones.length > 0 ? zones[0]._id : null;
}

/**
 * Mutación para migrar agentes del documento worlds a la tabla agents
 */
export const migrateAgentsToScalable = mutation({
  args: {
    batchSize: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      throw new Error('No se encontró el mundo por defecto');
    }

    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      throw new Error('No se encontró el mundo');
    }

    const zones = await ctx.db
      .query('zones')
      .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
      .collect();
    
    if (zones.length === 0) {
      throw new Error('No hay zonas creadas. Ejecuta createZones primero.');
    }

    const batchSize = args.batchSize || 100;
    const offset = args.offset || 0;
    const now = Date.now();

    let migrated = 0;
    let skipped = 0;

    for (let i = offset; i < Math.min(offset + batchSize, world.agents.length); i++) {
      const agent = world.agents[i];
      
      const existing = await ctx.db
        .query('agents')
        .withIndex('playerId', (q) => q.eq('playerId', agent.playerId))
        .first();
      
      if (existing) {
        skipped++;
        continue;
      }

      const player = world.players.find(p => p.id === agent.playerId);
      if (!player) {
        console.warn(`No se encontró jugador para agente ${agent.playerId}`);
        skipped++;
        continue;
      }

      const zoneId = findZoneForPosition(player.position.x, player.position.y, zones);
      if (!zoneId) {
        console.warn(`No se encontró zona para agente ${agent.playerId}`);
        skipped++;
        continue;
      }

      await ctx.db.insert('agents', {
        worldId: worldStatus.worldId,
        zoneId,
        playerId: agent.playerId,
        name: agent.playerId,
        position: player.position,
        facing: player.facing,
        status: 'idle' as const,
        lastActive: now,
        createdAt: now,
        updatedAt: now,
      });

      migrated++;
    }

    return {
      migrated,
      skipped,
      offset,
      batchSize,
      total: world.agents.length,
      nextOffset: offset + batchSize,
      hasMore: offset + batchSize < world.agents.length,
    };
  },
});

/**
 * Mutación para migrar jugadores del documento worlds a la tabla players
 */
export const migratePlayersToScalable = mutation({
  args: {
    batchSize: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      throw new Error('No se encontró el mundo por defecto');
    }

    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      throw new Error('No se encontró el mundo');
    }

    const zones = await ctx.db
      .query('zones')
      .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
      .collect();
    
    if (zones.length === 0) {
      throw new Error('No hay zonas creadas. Ejecuta createZones primero.');
    }

    const batchSize = args.batchSize || 100;
    const offset = args.offset || 0;
    const now = Date.now();

    let migrated = 0;
    let skipped = 0;

    for (let i = offset; i < Math.min(offset + batchSize, world.players.length); i++) {
      const player = world.players[i];
      
      // Verificar si existe usando playerId como índice (más eficiente)
      // Usamos el índice zoneId y filtramos manualmente
      const existing = await ctx.db
        .query('players')
        .withIndex('zoneId', (q) => q.eq('zoneId', zones[0]._id))
        .filter((q) => q.eq(q.field('id'), player.id))
        .first();
      
      if (existing) {
        skipped++;
        continue;
      }

      const zoneId = findZoneForPosition(player.position.x, player.position.y, zones);
      if (!zoneId) {
        console.warn(`No se encontró zona para jugador ${player.id}`);
        skipped++;
        continue;
      }

      const playerDesc = await ctx.db
        .query('playerDescriptions')
        .withIndex('worldId', (q) => 
          q.eq('worldId', worldStatus.worldId).eq('playerId', player.id)
        )
        .first();

      await ctx.db.insert('players', {
        worldId: worldStatus.worldId,
        zoneId,
        id: player.id,
        name: playerDesc?.name || player.id,
        position: player.position,
        facing: player.facing,
        speed: player.speed,
        lastInput: player.lastInput || now,
        status: 'online' as const,
        enteredZoneAt: now,
        createdAt: now,
        updatedAt: now,
      });

      migrated++;
    }

    return {
      migrated,
      skipped,
      offset,
      batchSize,
      total: world.players.length,
      nextOffset: offset + batchSize,
      hasMore: offset + batchSize < world.players.length,
    };
  },
});

// ============================================================================
// FUNCIONES PARA CARGAR DICCIONARIO
// ============================================================================

/**
 * Mutación INTERNA para cargar el diccionario (sin autenticación para scripts)
 */
export const loadDictionaryInternal = internalMutation({
  args: {
    entries: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      throw new Error('No se encontró el mundo por defecto');
    }

    const now = Date.now();
    let loaded = 0;
    let updated = 0;
    let skipped = 0;

    // Mapeo de campos del diccionario
    const fieldMappings: Record<string, { category: string; field: string }> = {
      'sexo_label': { category: 'sexo', field: 'sexo' },
      'sex_label': { category: 'sexo', field: 'sexo' },
      'area_label': { category: 'area', field: 'area' },
      'comuna_label': { category: 'comuna', field: 'comuna' },
      'comuna_bajo_umbral_label': { category: 'comuna_bajo_umbral', field: 'comuna_bajo_umbral' },
      'parentesco_label': { category: 'parentesco', field: 'parentesco' },
      'tipo_operativo_label': { category: 'tipo_operativo', field: 'tipo_operativo' },
      'provincia_label': { category: 'provincia', field: 'provincia' },
      'gse_mapped_label': { category: 'gse', field: 'gse' },
    };

    for (const entry of args.entries) {
      // Extraer campos del diccionario
      for (const [key, value] of Object.entries(entry)) {
        if (key.endsWith('_label') && value) {
          const mapping = fieldMappings[key];
          if (!mapping) continue;

          // Obtener el código original (campo sin _label)
          const codeField = key.replace('_label', '');
          const code = entry[codeField];
          
          if (!code) continue;

          // Buscar si ya existe
          const existing = await ctx.db
            .query('dictionaries')
            .withIndex('worldId_field_code', (q) => 
              q.eq('worldId', worldStatus.worldId)
               .eq('field', mapping.field)
               .eq('code', String(code))
            )
            .first();

          if (existing) {
            // Actualizar si cambió
            if (existing.label !== String(value)) {
              await ctx.db.patch(existing._id, {
                label: String(value),
                labelEs: String(value),
                updatedAt: now,
              });
              updated++;
            } else {
              skipped++;
            }
          } else {
            // Insertar nuevo
            await ctx.db.insert('dictionaries', {
              worldId: worldStatus.worldId,
              field: mapping.field,
              code: String(code),
              label: String(value),
              labelEs: String(value),
              category: mapping.category,
              description: `Etiqueta para ${mapping.field} = ${code}`,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            });
            loaded++;
          }
        }
      }
    }

    console.log(`✓ Diccionario: ${loaded} cargados, ${updated} actualizados, ${skipped} saltados`);

    return {
      loaded,
      updated,
      skipped,
      total: loaded + updated,
    };
  },
});

/**
 * ACTION para cargar el diccionario desde un archivo JSON
 * Esta action puede ser llamada desde scripts sin autenticación
 */
export const loadDictionaryAction = action({
  args: {
    entries: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(internal.aiTown.scalableMigration.loadDictionaryInternal, {
      entries: args.entries,
    });
  },
});

/**
 * Query para obtener el diccionario completo
 */
export const getDictionary = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      return { error: 'No se encontró el mundo por defecto', entries: [] };
    }

    let query;
    if (args.category) {
      query = ctx.db
        .query('dictionaries')
        .withIndex('category', (q) => q.eq('category', args.category));
    } else {
      query = ctx.db
        .query('dictionaries')
        .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId));
    }

    const entries = await query.collect();

    // Agrupar por campo
    const grouped: Record<string, Record<string, string>> = {};
    for (const entry of entries) {
      if (!grouped[entry.field]) {
        grouped[entry.field] = {};
      }
      grouped[entry.field][entry.code] = entry.labelEs || entry.label;
    }

    return {
      entries: grouped,
      total: entries.length,
      worldId: worldStatus.worldId,
    };
  },
});

/**
 * Query para obtener una etiqueta específica
 */
export const getLabel = query({
  args: {
    field: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      return null;
    }

    const entry = await ctx.db
      .query('dictionaries')
      .withIndex('worldId_field_code', (q) => 
        q.eq('worldId', worldStatus.worldId)
         .eq('field', args.field)
         .eq('code', args.code)
      )
      .first();

    return entry ? {
      code: entry.code,
      label: entry.labelEs || entry.label,
      category: entry.category,
    } : null;
  },
});

/**
 * Mutación para limpiar el diccionario
 */
export const clearDictionary = mutation({
  args: {},
  handler: async (ctx) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      throw new Error('No se encontró el mundo por defecto');
    }

    const entries = await ctx.db
      .query('dictionaries')
      .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
      .collect();

    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    return { deleted: entries.length };
  },
});

/**
 * Mutación para migrar conversaciones del documento worlds a la tabla conversations
 */
export const migrateConversationsToScalable = mutation({
  args: {
    batchSize: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    
    if (!worldStatus) {
      throw new Error('No se encontró el mundo por defecto');
    }

    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      throw new Error('No se encontró el mundo');
    }

    const zones = await ctx.db
      .query('zones')
      .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
      .collect();
    
    if (zones.length === 0) {
      throw new Error('No hay zonas creadas. Ejecuta createZones primero.');
    }

    const batchSize = args.batchSize || 100;
    const offset = args.offset || 0;
    const now = Date.now();

    let migrated = 0;
    let skipped = 0;

    for (let i = offset; i < Math.min(offset + batchSize, world.conversations.length); i++) {
      const conversation = world.conversations[i];
      
      // Verificar si existe usando el índice zoneId y filtrando
      const conversationsInZone = await ctx.db
        .query('conversations')
        .withIndex('zoneId', (q) => q.eq('zoneId', zones[0]._id))
        .filter((q) => q.eq(q.field('id'), conversation.id))
        .first();
      
      if (conversationsInZone) {
        skipped++;
        continue;
      }

      const firstParticipant = conversation.participants[0];
      if (!firstParticipant) {
        skipped++;
        continue;
      }

      const player = world.players.find(p => p.id === firstParticipant.playerId);
      const zoneId = player 
        ? findZoneForPosition(player.position.x, player.position.y, zones)
        : zones[0]._id;
      
      if (!zoneId) {
        skipped++;
        continue;
      }

      // Transformar participantes al nuevo formato
      const participants = conversation.participants.map(p => ({
        playerId: p.playerId,
        joinedAt: p.invited,
        agentId: undefined,
        leftAt: undefined,
      }));

      // Transformar último mensaje al nuevo formato
      const lastMessage = conversation.lastMessage ? {
        id: crypto.randomUUID(),
        authorId: conversation.lastMessage.author,
        text: '',
        timestamp: conversation.lastMessage.timestamp,
      } : undefined;

      await ctx.db.insert('conversations', {
        worldId: worldStatus.worldId,
        zoneId,
        id: conversation.id,
        creator: conversation.creator,
        created: conversation.created,
        status: 'active' as const,
        participants,
        lastMessage,
        numMessages: conversation.numMessages,
        lastMessageAt: conversation.lastMessage?.timestamp,
        updatedAt: now,
      });

      migrated++;
    }

    return {
      migrated,
      skipped,
      offset,
      batchSize,
      total: world.conversations.length,
      nextOffset: offset + batchSize,
      hasMore: offset + batchSize < world.conversations.length,
    };
  },
});