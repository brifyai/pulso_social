import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAdminMutation, requireAdminQuery } from "../auth";

// Mutación para insertar múltiples agentes en lote
// SOLO ADMINISTRADORES pueden insertar agentes
export const bulkInsertPanelAgents = mutation({
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
        worldId: v.id("worlds"),
        isVisible: v.boolean(),
        x: v.number(),
        y: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden insertar agentes
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} insertando agentes...`);
    
    const inserted = [];
    for (const agent of args.agents) {
      const id = await ctx.db.insert("panelAgents", agent);
      inserted.push(id);
    }
    return { inserted: inserted.length };
  },
});

// Query para obtener todos los agentes del panel
export const getAllPanelAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("panelAgents").collect();
  },
});

// Query para obtener agentes visibles
export const getVisiblePanelAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("panelAgents")
      .filter((q) => q.eq(q.field("isVisible"), true))
      .collect();
  },
});

// Query para obtener agentes por región
export const getPanelAgentsByRegion = query({
  args: { region: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("panelAgents")
      .filter((q) => q.eq(q.field("region"), args.region))
      .collect();
  },
});

// Query para obtener agentes por GSE
export const getPanelAgentsByGSE = query({
  args: { gse: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("panelAgents")
      .filter((q) => q.eq(q.field("gse"), args.gse))
      .collect();
  },
});

// Mutación para limpiar todos los agentes del panel
// SOLO ADMINISTRADORES pueden limpiar agentes
export const clearPanelAgents = mutation({
  args: {},
  handler: async (ctx) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden limpiar agentes
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} limpiando agentes...`);
    
    const agents = await ctx.db.query("panelAgents").collect();
    for (const agent of agents) {
      await ctx.db.delete(agent._id);
    }
    return { deleted: agents.length };
  },
});

// Query para obtener el worldId por defecto
export const getDefaultWorldId = query({
  args: {},
  handler: async (ctx) => {
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }
    return worldStatus.worldId;
  },
});

// Mutación interna para insertar múltiples agentes en lote
export const bulkInsertPanelAgentsInternal = internalMutation({
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
        worldId: v.id("worlds"),
        isVisible: v.boolean(),
        x: v.number(),
        y: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const inserted = [];
    for (const agent of args.agents) {
      const id = await ctx.db.insert("panelAgents", agent);
      inserted.push(id);
    }
    return { inserted: inserted.length };
  },
});

// Query interna para obtener el worldId por defecto
export const getDefaultWorldIdInternal = query({
  args: {},
  handler: async (ctx) => {
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }
    return worldStatus.worldId;
  },
});

// ⚠️ Mutación para carga masiva - RESTRINGIDA A ADMINISTRADORES
// Solo administradores pueden cargar agentes masivamente
export const bulkInsertPublic = mutation({
  args: {
    agents: v.array(v.any()), // Recibe un array de objetos JSON (tus agentes)
    table: v.optional(v.string()), // Tabla destino (por defecto: panelAgents)
  },
  handler: async (ctx, args) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden cargar agentes
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} cargando agentes masivamente en ${args.table || "panelAgents"}...`);
    
    const tableName = args.table || "panelAgents";
    // Inserta cada agente uno por uno en la tabla especificada
    // Convex maneja transacciones atómicas, así que es seguro
    for (const agent of args.agents) {
      await ctx.db.insert(tableName as any, agent);
    }
    return { inserted: args.agents.length };
  },
});

// Mutación para migrar agentes de agentsFull a aiTown usando cursor
// SOLO ADMINISTRADORES pueden migrar agentes
// Esta versión es más eficiente porque no necesita leer todos los agentes intermedios
export const migrateAgentsToAiTown = mutation({
  args: {
    limit: v.optional(v.number()), // Límite de agentes a migrar (para pruebas)
    batchSize: v.optional(v.number()), // Tamaño del lote para paginación (por defecto: 100)
    cursor: v.optional(v.string()), // Cursor para continuar migración (playerId del último agente migrado)
  },
  handler: async (ctx, args) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden migrar agentes
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} migrando agentes...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    const batchSize = args.batchSize || 50;
    const limit = args.limit || 100;
    let cursor: any = args.cursor || null;
    
    // Obtener el siguiente número de input solo una vez al principio
    const prevInput = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) => q.eq("engineId", engine._id))
      .order("desc")
      .first();
    let nextInputNumber = prevInput ? prevInput.number + 1 : 0;
    
    let migrated = 0;

    while (migrated < limit) {
      // Obtener un lote de agentes usando paginación con cursor
      let query;
      if (cursor) {
        query = ctx.db.query("agentsFull").withIndex("playerId", (q) => q.gt("playerId", cursor));
      } else {
        query = ctx.db.query("agentsFull").withIndex("playerId");
      }
      const batch = await query.take(batchSize);
      
      if (batch.length === 0) {
        break; // No hay más agentes
      }

      for (const agent of batch) {
        if (migrated >= limit) {
          break;
        }

        // Crear una descripción basada en los datos del agente
        const identity = `${agent.name} es una persona de ${agent.age} años de ${agent.comuna}, ${agent.region}. ` +
          `Pertenece al grupo socioeconómico ${agent.gse}. ` +
          (agent.sex ? `Sexo: ${agent.sex}. ` : "") +
          (agent.p23_est_civil ? `Estado civil: ${agent.p23_est_civil}. ` : "") +
          (agent.escolaridad ? `Escolaridad: ${agent.escolaridad}. ` : "") +
          (agent.sit_fuerza_trabajo ? `Situación laboral: ${agent.sit_fuerza_trabajo}. ` : "") +
          (agent.politicalLeaning !== undefined ? `Inclinación política: ${agent.politicalLeaning}. ` : "") +
          (agent.interests && agent.interests.length > 0 ? `Intereses: ${agent.interests.join(", ")}. ` : "");

        const plan = `${agent.name} está explorando el mundo virtual de aiTown. ` +
          `Le interesa conocer a otras personas y participar en conversaciones. ` +
          `Sus intereses incluyen ${agent.interests && agent.interests.length > 0 ? agent.interests.join(", ") : "varios temas"}.`;

        // Insertar un input createAgentFromData
        const inputId = await ctx.db.insert("inputs", {
          engineId: engine._id,
          number: nextInputNumber,
          name: "createAgentFromData",
          args: {
            name: agent.name,
            character: "f1", // Usamos un character válido (f1-f8)
            identity: identity,
            plan: plan,
            x: agent.x,
            y: agent.y,
            agentData: {
              age: agent.age,
              sex: agent.sex,
              region: agent.region,
              comuna: agent.comuna,
              gse: agent.gse,
              politicalLeaning: agent.politicalLeaning,
              interests: agent.interests,
              playerId: agent.playerId,
            },
          },
          received: Date.now(),
        });

        migrated++;
        nextInputNumber++;
        cursor = agent.playerId;
      }

      if (batch.length < batchSize) {
        break; // Último lote
      }
    }

    return {
      migrated,
      cursor,
      total: migrated,
      worldId: worldStatus.worldId,
      engineId: engine._id,
    };
  },
});

// Query para contar los inputs de migración creados
export const countMigrationInputs = query({
  args: {},
  handler: async (ctx) => {
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Contar los inputs createAgentFromData
    const inputs = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) => q.eq("engineId", worldStatus.engineId))
      .filter((q) => q.eq(q.field("name"), "createAgentFromData"))
      .collect();
    
    return {
      count: inputs.length,
      engineId: worldStatus.engineId,
      worldId: worldStatus.worldId,
    };
  },
});

// Query para verificar el estado del engine y los inputs procesados
export const getEngineStatus = query({
  args: {},
  handler: async (ctx) => {
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    // Contar inputs de migración
    const migrationInputs = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) => q.eq("engineId", worldStatus.engineId))
      .filter((q) => q.eq(q.field("name"), "createAgentFromData"))
      .collect();

    // Contar inputs procesados
    const processedInputs = migrationInputs.filter(input => input.returnValue !== undefined);

    return {
      engineStatus: engine.running ? "running" : "stopped",
      processedInputNumber: engine.processedInputNumber || 0,
      totalMigrationInputs: migrationInputs.length,
      processedMigrationInputs: processedInputs.length,
      generationNumber: engine.generationNumber,
      worldId: worldStatus.worldId,
      engineId: worldStatus.engineId,
    };
  },
});

// Query para verificar los últimos inputs de migración y sus errores
export const getMigrationInputErrors = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener los últimos inputs de migración procesados
    const inputs = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) => q.eq("engineId", worldStatus.engineId))
      .filter((q) => q.eq(q.field("name"), "createAgentFromData"))
      .order("desc")
      .take(limit);

    return inputs.map(input => ({
      number: input.number,
      returnValue: input.returnValue,
      hasError: input.returnValue?.kind === "error",
      errorMessage: input.returnValue?.kind === "error" ? input.returnValue.message : undefined,
    }));
  },
});

// Query para verificar los inputs más recientes de migración con sus argumentos
export const getRecentMigrationInputs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener los últimos inputs de migración
    const inputs = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) => q.eq("engineId", worldStatus.engineId))
      .filter((q) => q.eq(q.field("name"), "createAgentFromData"))
      .order("desc")
      .take(limit);

    return inputs.map(input => ({
      number: input.number,
      character: input.args?.character,
      name: input.args?.name,
      returnValue: input.returnValue,
      hasError: input.returnValue?.kind === "error",
      errorMessage: input.returnValue?.kind === "error" ? input.returnValue.message : undefined,
    }));
  },
});

// Query para contar inputs de migración por character
export const countMigrationInputsByCharacter = query({
  args: {
    character: v.string(),
  },
  handler: async (ctx, args) => {
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener todos los inputs de migración con el character especificado
    const inputs = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) => q.eq("engineId", worldStatus.engineId))
      .filter((q) => q.eq(q.field("name"), "createAgentFromData"))
      .collect();

    const filteredInputs = inputs.filter(input => input.args?.character === args.character);
    const successfulInputs = filteredInputs.filter(input => input.returnValue?.kind === "ok");
    const failedInputs = filteredInputs.filter(input => input.returnValue?.kind === "error");

    return {
      total: filteredInputs.length,
      successful: successfulInputs.length,
      failed: failedInputs.length,
      character: args.character,
    };
  },
});

// Query simple para obtener el estado del motor del juego
export const getSimpleEngineStatus = query({
  args: {},
  handler: async (ctx) => {
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    return {
      engineId: engine._id,
      generationNumber: engine.generationNumber,
      processedInputNumber: engine.processedInputNumber,
      status: worldStatus.status,
    };
  },
});

// Query para verificar cuántos agentes hay en el mundo de aiTown
export const countAiTownAgents = query({
  args: {},
  handler: async (ctx) => {
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el mundo
    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      throw new Error("No se encontró el mundo");
    }

    return {
      agentsCount: world.agents.length,
      playersCount: world.players.length,
      conversationsCount: world.conversations.length,
      worldId: worldStatus.worldId,
    };
  },
});

// Query para encontrar la posición de los inputs de migración
export const findMigrationInputsPosition = query({
  args: {},
  handler: async (ctx) => {
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    const processedInputNumber = engine.processedInputNumber ?? -1;

    // Encontrar el primer input de migración
    const firstMigrationInput = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) =>
        q.eq("engineId", engine._id).gt("number", processedInputNumber)
      )
      .filter((q) => q.eq(q.field("name"), "createAgentFromData"))
      .order("asc")
      .first();

    // Contar inputs de migración pendientes
    const migrationInputs = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) =>
        q.eq("engineId", engine._id).gt("number", processedInputNumber)
      )
      .filter((q) => q.eq(q.field("name"), "createAgentFromData"))
      .take(100);

    // Contar inputs de finishDoSomething pendientes
    const finishDoSomethingInputs = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) =>
        q.eq("engineId", engine._id).gt("number", processedInputNumber)
      )
      .filter((q) => q.eq(q.field("name"), "finishDoSomething"))
      .take(100);

    return {
      engineProcessedInputNumber: processedInputNumber,
      firstMigrationInputNumber: firstMigrationInput?.number ?? null,
      migrationInputsCount: migrationInputs.length,
      finishDoSomethingInputsCount: finishDoSomethingInputs.length,
      inputsBeforeFirstMigration: firstMigrationInput
        ? firstMigrationInput.number - processedInputNumber - 1
        : 0,
    };
  },
});

// Query para analizar los inputs pendientes de procesamiento
export const analyzePendingInputs = query({
  args: {},
  handler: async (ctx) => {
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    // Obtener los primeros 100 inputs pendientes
    const processedInputNumber = engine.processedInputNumber ?? -1;
    const pendingInputs = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) =>
        q.eq("engineId", engine._id).gt("number", processedInputNumber)
      )
      .order("asc")
      .take(100);

    // Obtener el último input procesado
    const lastProcessedInput = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) =>
        q.eq("engineId", engine._id).lte("number", processedInputNumber)
      )
      .order("desc")
      .first();

    return {
      engineProcessedInputNumber: engine.processedInputNumber,
      engineCurrentTime: engine.currentTime,
      pendingInputsCount: pendingInputs.length,
      firstPendingInput: pendingInputs[0] ? {
        number: pendingInputs[0].number,
        name: pendingInputs[0].name,
        received: pendingInputs[0].received,
      } : null,
      lastProcessedInput: lastProcessedInput ? {
        number: lastProcessedInput.number,
        name: lastProcessedInput.name,
        received: lastProcessedInput.received,
      } : null,
      samplePendingInputs: pendingInputs.slice(0, 5).map(input => ({
        number: input.number,
        name: input.name,
        received: input.received,
      })),
    };
  },
});

// Mutación para reiniciar el motor del juego
// SOLO ADMINISTRADORES pueden reiniciar el motor
export const kickEngine = mutation({
  args: {},
  handler: async (ctx) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden reiniciar el motor
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} reiniciando el motor...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    // Incrementar el número de generación para forzar al motor a continuar
    const generationNumber = engine.generationNumber + 1;
    
    // Si el motor está detenido, reactivarlo
    if (!engine.running) {
      await ctx.db.patch(engine._id, { 
        generationNumber,
        running: true,
      });
    } else {
      await ctx.db.patch(engine._id, { generationNumber });
    }
    
    // Programar el siguiente paso
    await ctx.scheduler.runAfter(0, internal.aiTown.main.runStep, {
      worldId: worldStatus.worldId,
      generationNumber,
      maxDuration: 60000, // 60 segundos
    });

    return { success: true, generationNumber, running: true };
  },
});

// Mutación para actualizar el tiempo del engine
// SOLO ADMINISTRADORES pueden actualizar el tiempo del engine
export const updateEngineTime = mutation({
  args: {},
  handler: async (ctx) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden actualizar el tiempo
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} actualizando el tiempo del engine...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    if (!engine.running) {
      throw new Error("El motor no está corriendo");
    }

    const now = Date.now();
    
    // Actualizar el tiempo del engine al tiempo actual
    await ctx.db.patch(engine._id, { 
      currentTime: now,
      lastStepTs: now,
    });
    
    // Incrementar el número de generación para forzar al motor a continuar
    const generationNumber = engine.generationNumber + 1;
    await ctx.db.patch(engine._id, { generationNumber });
    
    // Programar el siguiente paso
    await ctx.scheduler.runAfter(0, internal.aiTown.main.runStep, {
      worldId: worldStatus.worldId,
      generationNumber,
      maxDuration: 60000,
    });

    return { 
      success: true, 
      generationNumber,
      oldTime: engine.currentTime,
      newTime: now,
    };
  },
});

// Mutación para limpiar inputs finishDoSomething pendientes
// SOLO ADMINISTRADORES pueden limpiar inputs bloqueantes
export const clearBlockingFinishDoSomethingInputs = mutation({
  args: {
    limit: v.optional(v.number()), // Límite de inputs a limpiar
  },
  handler: async (ctx, args) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden limpiar inputs
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} limpiando inputs finishDoSomething...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    const processedInputNumber = engine.processedInputNumber ?? -1;
    const limit = args.limit || 1000;

    // Obtener los inputs finishDoSomething pendientes
    const pendingInputs = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) =>
        q.eq("engineId", engine._id).gt("number", processedInputNumber)
      )
      .filter((q) => q.eq(q.field("name"), "finishDoSomething"))
      .take(limit);

    // Eliminar los inputs
    let deleted = 0;
    for (const input of pendingInputs) {
      await ctx.db.delete(input._id);
      deleted++;
    }

    // Reiniciar el motor para que continúe con los inputs de migración
    const generationNumber = engine.generationNumber + 1;
    await ctx.db.patch(engine._id, { generationNumber });
    
    await ctx.scheduler.runAfter(0, internal.aiTown.main.runStep, {
      worldId: worldStatus.worldId,
      generationNumber,
      maxDuration: 60000,
    });

    return { 
      success: true, 
      deleted,
      generationNumber,
      engineId: engine._id,
    };
  },
});

// Query para obtener el nextId actual del mundo
export const getWorldNextId = query({
  args: {},
  handler: async (ctx) => {
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el mundo
    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      throw new Error("No se encontró el mundo");
    }

    return {
      nextId: world.nextId,
      agentsCount: world.agents.length,
      playersCount: world.players.length,
      worldId: worldStatus.worldId,
    };
  },
});

// Mutación para corregir el nextId del mundo basado en los agentes existentes
export const fixNextId = mutation({
  args: {},
  handler: async (ctx) => {
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el mundo
    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      throw new Error("No se encontró el mundo");
    }

    // Calcular el nextId correcto basado en los agentes y jugadores existentes
    let maxId = 0;
    
    for (const player of world.players) {
      const playerId = parseInt(player.id.split(':')[1]);
      if (playerId > maxId) {
        maxId = playerId;
      }
    }
    
    for (const agent of world.agents) {
      const agentId = parseInt(agent.id.split(':')[1]);
      if (agentId > maxId) {
        maxId = agentId;
      }
    }
    
    // El nextId debe ser mayor que cualquier ID existente
    const newNextId = maxId + 1;
    
    // Actualizar el mundo
    const updatedWorld = {
      ...world,
      nextId: newNextId,
    };
    
    await ctx.db.replace(world._id, updatedWorld);
    
    return {
      oldNextId: world.nextId,
      newNextId,
      agentsCount: world.agents.length,
      playersCount: world.players.length,
      worldId: worldStatus.worldId,
    };
  },
});

// Mutación para limpiar un lote pequeño de inputs de migración
// SOLO ADMINISTRADORES pueden limpiar inputs de migración
export const clearPendingMigrationInputsBatch = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden limpiar inputs
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} limpiando inputs de migración (lote)...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    const batchSize = args.batchSize || 50;
    let deleted = 0;

    // Obtener un lote pequeño de inputs usando el índice byInputNumber
    // Filtramos por engineId y nombre de input
    const batch = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) => q.eq("engineId", worldStatus.engineId))
      .filter((q) => q.eq(q.field("name"), "createAgentFromData"))
      .take(batchSize);
    
    if (batch.length === 0) {
      return { 
        success: true, 
        deleted: 0,
        done: true,
        engineId: worldStatus.engineId,
      };
    }

    // Eliminar todos los inputs del lote
    for (const input of batch) {
      await ctx.db.delete(input._id);
      deleted++;
    }

    return { 
      success: true, 
      deleted,
      done: batch.length < batchSize,
      engineId: worldStatus.engineId,
    };
  },
});

// Mutación para limpiar todos los inputs de migración pendientes
// SOLO ADMINISTRADORES pueden limpiar inputs de migración
export const clearPendingMigrationInputs = mutation({
  args: {},
  handler: async (ctx) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden limpiar inputs
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} limpiando inputs de migración...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    const processedInputNumber = engine.processedInputNumber ?? -1;
    let deleted = 0;
    let minNumber = processedInputNumber + 1;

    while (true) {
      // Obtener un lote muy pequeño de inputs usando paginación por número
      const batch = await ctx.db
        .query("inputs")
        .withIndex("byInputNumber", (q) =>
          q.eq("engineId", engine._id).gte("number", minNumber)
        )
        .take(50); // Lote muy pequeño para evitar límite de lecturas
      
      if (batch.length === 0) {
        break; // No hay más inputs
      }

      // Filtrar solo los inputs de migración y eliminarlos
      let batchDeleted = 0;
      let maxNumberInBatch = minNumber;
      
      for (const input of batch) {
        if (input.name === "createAgentFromData") {
          await ctx.db.delete(input._id);
          batchDeleted++;
        }
        if (input.number > maxNumberInBatch) {
          maxNumberInBatch = input.number;
        }
      }
      
      deleted += batchDeleted;
      
      // Avanzar al siguiente rango de números
      minNumber = maxNumberInBatch + 1;
      
      // Si el lote fue menor a 50, hemos terminado
      if (batch.length < 50) {
        break;
      }
    }

    return { 
      success: true, 
      deleted,
      engineId: engine._id,
    };
  },
});

// Mutación INTERNA para limpiar una tabla en lotes (sin autenticación para scripts)
// Usar solo para migración de agentes
export const clearTableBatchInternal = internalMutation({
  args: {
    tableName: v.union(
      v.literal("panelAgents"),
      v.literal("agentsFull"),
      v.literal("agentDescriptions"),
      v.literal("playerDescriptions"),
    ),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`🗑️ Limpiando tabla ${args.tableName}...`);
    
    const batchSize = args.batchSize || 100;
    let deleted = 0;

    // Obtener un lote de registros
    const batch = await ctx.db
      .query(args.tableName as any)
      .take(batchSize);
    
    if (batch.length === 0) {
      return { 
        success: true, 
        deleted: 0,
        done: true,
      };
    }

    // Eliminar todos los registros del lote
    for (const record of batch) {
      await ctx.db.delete(record._id);
      deleted++;
    }

    console.log(`   → ${deleted} registros eliminados`);
    
    return { 
      success: true, 
      deleted,
      done: batch.length < batchSize,
    };
  },
});

// Mutación INTERNA para limpiar panelAgents en lotes (sin autenticación para scripts)
export const clearPanelAgentsInternal = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log('🗑️ Limpiando lote de panelAgents...');
    
    const batchSize = args.batchSize || 100;
    let deleted = 0;

    // Obtener un lote de registros
    const batch = await ctx.db.query("panelAgents").take(batchSize);
    
    if (batch.length === 0) {
      console.log('✓ No hay más agentes para eliminar');
      return { deleted: 0, done: true };
    }

    // Eliminar todos los registros del lote
    for (const agent of batch) {
      await ctx.db.delete(agent._id);
      deleted++;
    }
    
    console.log(`✓ ${deleted} agentes eliminados en este lote`);
    
    return { deleted, done: batch.length < batchSize };
  },
});

// Mutación INTERNA para eliminar agentes de panelAgents por playerId (para migración)
export const deletePanelAgentsByPlayerId = internalMutation({
  args: {
    playerIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`🗑️ Eliminando ${args.playerIds.length} agentes por playerId...`);
    
    let deleted = 0;
    const allAgents = await ctx.db.query("panelAgents").collect();
    
    for (const agent of allAgents) {
      if (args.playerIds.includes(agent.playerId)) {
        await ctx.db.delete(agent._id);
        deleted++;
      }
    }
    
    console.log(`✓ ${deleted} agentes eliminados`);
    
    return { deleted };
  },
});

// Mutación INTERNA para eliminar agentes de panelAgents hasta un playerId (para migración)
export const deletePanelAgentsUpToPlayerId = internalMutation({
  args: {
    maxPlayerId: v.string(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`🗑️ Eliminando agentes hasta playerId: ${args.maxPlayerId}...`);
    
    const batchSize = args.batchSize || 100;
    let deleted = 0;
    
    // Obtener un lote de agentes
    const batch = await ctx.db.query("panelAgents").take(batchSize);
    
    if (batch.length === 0) {
      return { deleted: 0, done: true };
    }
    
    // Eliminar agentes cuyo playerId <= maxPlayerId
    for (const agent of batch) {
      if (agent.playerId <= args.maxPlayerId) {
        await ctx.db.delete(agent._id);
        deleted++;
      }
    }
    
    console.log(`✓ ${deleted} agentes eliminados en este lote`);
    
    return { 
      deleted, 
      done: batch.length < batchSize || deleted === 0,
    };
  },
});

// Mutación INTERNA para reiniciar el motor del juego (sin autenticación para scripts)
export const kickEngineInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log(`🔄 Reiniciando el motor...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    // Incrementar el número de generación para forzar al motor a continuar
    const generationNumber = engine.generationNumber + 1;
    
    // Si el motor está detenido, reactivarlo
    if (!engine.running) {
      await ctx.db.patch(engine._id, { 
        generationNumber,
        running: true,
      });
    } else {
      await ctx.db.patch(engine._id, { generationNumber });
    }
    
    // Programar el siguiente paso
    await ctx.scheduler.runAfter(0, internal.aiTown.main.runStep, {
      worldId: worldStatus.worldId,
      generationNumber,
      maxDuration: 60000, // 60 segundos
    });

    console.log(`✓ Motor reiniciado (generation: ${generationNumber})`);
    
    return { success: true, generationNumber, running: true };
  },
});

// Mutación INTERNA para activar el mundo y reiniciar el motor (sin autenticación para scripts)
export const activateWorldAndKickEngineInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log(`🌍 Activando mundo y reiniciando motor...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    // Cambiar el estado del mundo a "running"
    await ctx.db.patch(worldStatus._id, { status: "running" });
    console.log(`✓ Estado del mundo cambiado a "running"`);

    // Incrementar el número de generación para forzar al motor a continuar
    const generationNumber = engine.generationNumber + 1;
    
    // Si el motor está detenido, reactivarlo
    if (!engine.running) {
      await ctx.db.patch(engine._id, { 
        generationNumber,
        running: true,
      });
    } else {
      await ctx.db.patch(engine._id, { generationNumber });
    }
    
    // Programar el siguiente paso
    await ctx.scheduler.runAfter(0, internal.aiTown.main.runStep, {
      worldId: worldStatus.worldId,
      generationNumber,
      maxDuration: 60000, // 60 segundos
    });

    console.log(`✓ Motor reiniciado (generation: ${generationNumber})`);
    
    return { 
      success: true, 
      generationNumber, 
      running: true,
      worldStatus: "running",
      worldId: worldStatus.worldId,
      engineId: engine._id,
    };
  },
});

// Mutación INTERNA para limpiar agentsFull en lotes (sin autenticación para scripts)
export const clearAgentsFullInternal = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log('🗑️ Limpiando lote de agentsFull...');
    
    const batchSize = args.batchSize || 100;
    let deleted = 0;

    // Obtener un lote de registros
    const batch = await ctx.db.query("agentsFull").take(batchSize);
    
    if (batch.length === 0) {
      console.log('✓ No hay más agentes para eliminar');
      return { deleted: 0, done: true };
    }

    // Eliminar todos los registros del lote
    for (const agent of batch) {
      await ctx.db.delete(agent._id);
      deleted++;
    }
    
    console.log(`✓ ${deleted} agentes eliminados en este lote`);
    
    return { deleted, done: batch.length < batchSize };
  },
});

// Mutación para limpiar una tabla en lotes
// SOLO ADMINISTRADORES pueden limpiar tablas
export const clearTableBatch = mutation({
  args: {
    tableName: v.union(
      v.literal("panelAgents"),
      v.literal("agentsFull"),
      v.literal("agentDescriptions"),
      v.literal("playerDescriptions"),
    ),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden limpiar tablas
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} limpiando tabla ${args.tableName}...`);
    
    const batchSize = args.batchSize || 100;
    let deleted = 0;

    // Obtener un lote de registros
    const batch = await ctx.db
      .query(args.tableName as any)
      .take(batchSize);
    
    if (batch.length === 0) {
      return { 
        success: true, 
        deleted: 0,
        done: true,
      };
    }

    // Eliminar todos los registros del lote
    for (const record of batch) {
      await ctx.db.delete(record._id);
      deleted++;
    }

    return { 
      success: true, 
      deleted,
      done: batch.length < batchSize,
    };
  },
});

// Query para contar registros en una tabla
export const countTable = query({
  args: {
    tableName: v.union(
      v.literal("panelAgents"),
      v.literal("agentsFull"),
      v.literal("agentDescriptions"),
      v.literal("playerDescriptions"),
    ),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query(args.tableName as any)
      .collect();
    
    return {
      count: records.length,
      tableName: args.tableName,
    };
  },
});

// Query para contar agentes por GSE
export const countAgentsByGSE = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("panelAgents").collect();
    
    const gseCount: Record<string, number> = {};
    for (const agent of agents) {
      const gse = agent.gse || "Unknown";
      gseCount[gse] = (gseCount[gse] || 0) + 1;
    }
    
    return {
      total: agents.length,
      byGse: gseCount,
    };
  },
});

// Query para contar agentes visibles
export const countVisibleAgents = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db
      .query("panelAgents")
      .filter((q) => q.eq(q.field("isVisible"), true))
      .collect();
    
    return {
      visible: agents.length,
      total: await ctx.db.query("panelAgents").collect().then(a => a.length),
    };
  },
});

// Mutación para insertar agentes desde stdin (para scripts de carga masiva)
// Función pública sin autenticación para uso con scripts locales
export const bulkInsertAgentsFromFile = mutation({
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
        worldId: v.id("worlds"),
        isVisible: v.boolean(),
        x: v.number(),
        y: v.number(),
      })
    ),
    worldId: v.id("worlds"),
  },
  handler: async (ctx, args) => {
    console.log(`📥 Insertando ${args.agents.length} agentes...`);
    
    const inserted = [];
    for (const agent of args.agents) {
      const id = await ctx.db.insert("panelAgents", agent);
      inserted.push(id);
    }
    
    console.log(`✓ ${inserted.length} agentes insertados`);
    return { inserted: inserted.length };
  },
});

// Mutación PÚBLICA para insertar agentes directamente a aiTown desde un array de datos
// Esta versión inserta los agentes directamente en el mundo sin pasar por panelAgents
export const insertAgentsDirectlyToAiTown = mutation({
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
        x: v.number(),
        y: v.number(),
        sex: v.optional(v.string()),
        p23_est_civil: v.optional(v.string()),
        escolaridad: v.optional(v.string()),
        sit_fuerza_trabajo: v.optional(v.string()),
      })
    ),
    startIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Llamar a la función interna
    return await ctx.runMutation(internal.pulso.agents.insertAgentsDirectlyToAiTownInternal, {
      agents: args.agents,
      startIndex: args.startIndex,
    });
  },
});

// Mutación INTERNA para insertar agentes directamente a aiTown desde un array de datos
// Sin autenticación para uso con scripts locales
// Esta versión inserta los agentes directamente en el mundo sin pasar por panelAgents
// Optimizada para evitar límites de tiempo y bytes
export const insertAgentsDirectlyToAiTownInternal = internalMutation({
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
        x: v.number(),
        y: v.number(),
        sex: v.optional(v.string()),
        p23_est_civil: v.optional(v.string()),
        escolaridad: v.optional(v.string()),
        sit_fuerza_trabajo: v.optional(v.string()),
      })
    ),
    startIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 Insertando ${args.agents.length} agentes directamente a aiTown...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el mundo
    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      throw new Error("No se encontró el mundo");
    }

    let nextId = args.startIndex ?? world.nextId;
    let inserted = 0;

    // Procesar solo 10 agentes por ejecución para evitar límites
    const maxAgents = Math.min(args.agents.length, 10);
    
    for (let i = 0; i < maxAgents; i++) {
      const agent = args.agents[i];
      
      // Crear una descripción basada en los datos del agente (simplificada)
      const identity = `${agent.name} es una persona de ${agent.age} años de ${agent.comuna}, ${agent.region}. GSE: ${agent.gse}.`;
      const plan = `${agent.name} está explorando aiTown. Intereses: ${agent.interests.slice(0, 3).join(", ")}.`;

      // Crear el jugador
      const playerId = `p:${nextId}`;
      const player = {
        id: playerId,
        human: agent.name,
        position: { x: agent.x ?? 0, y: agent.y ?? 0 },
        activity: undefined,
        pathfinding: undefined,
        lastInput: Date.now(),
        facing: { dx: 0, dy: -1 },
        speed: 0,
      };

      // Crear el agente
      const agentId = `a:${nextId + 1}`;
      const newAgent = {
        id: agentId,
        playerId: playerId,
        inProgressOperation: undefined,
        lastConversation: undefined,
        lastInviteAttempt: undefined,
        toRemember: undefined,
      };

      // Actualizar el mundo
      const updatedWorld = {
        ...world,
        nextId: nextId + 2,
        players: [...world.players, player],
        agents: [...world.agents, newAgent],
      };

      // Guardar el mundo actualizado
      await ctx.db.replace(world._id, updatedWorld);

      // Crear la descripción del agente
      await ctx.db.insert("agentDescriptions", {
        worldId: world._id,
        agentId: agentId,
        identity: identity,
        plan: plan,
      });

      inserted++;
      nextId += 2;
    }

    console.log(`✓ ${inserted} agentes insertados en este lote`);

    return {
      inserted,
      total: inserted,
      worldId: worldStatus.worldId,
      nextId,
      remaining: args.agents.length - inserted,
    };
  },
});

// Mutación INTERNA para migrar agentes directamente a aiTown (sin usar el motor)
// Sin autenticación para uso con scripts locales
// Esta versión lee desde panelAgents y inserta directamente en el mundo
export const migrateAgentsDirectlyToAiTownInternal = internalMutation({
  args: {
    limit: v.optional(v.number()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 Migrando agentes directamente a aiTown desde panelAgents...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el mundo
    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      throw new Error("No se encontró el mundo");
    }

    const batchSize = args.batchSize || 100;
    const limit = args.limit || 100;
    
    let migrated = 0;
    let nextId = world.nextId;

    while (migrated < limit) {
      // Obtener un lote de agentes desde panelAgents
      const batch = await ctx.db.query("panelAgents").take(batchSize);
      
      if (batch.length === 0) {
        break;
      }

      // Procesar agentes en este lote
      let processedInBatch = 0;
      for (const agent of batch) {
        if (migrated >= limit) {
          break;
        }

        // Crear una descripción basada en los datos del agente
        const identity = `${agent.name} es una persona de ${agent.age} años de ${agent.comuna}, ${agent.region}. ` +
          `Pertenece al grupo socioeconómico ${agent.gse}. ` +
          (agent.sex ? `Sexo: ${agent.sex}. ` : "") +
          (agent.p23_est_civil ? `Estado civil: ${agent.p23_est_civil}. ` : "") +
          (agent.escolaridad ? `Escolaridad: ${agent.escolaridad}. ` : "") +
          (agent.sit_fuerza_trabajo ? `Situación laboral: ${agent.sit_fuerza_trabajo}. ` : "") +
          (agent.politicalLeaning !== undefined ? `Inclinación política: ${agent.politicalLeaning}. ` : "") +
          (agent.interests && agent.interests.length > 0 ? `Intereses: ${agent.interests.join(", ")}. ` : "");

        const plan = `${agent.name} está explorando el mundo virtual de aiTown. ` +
          `Le interesa conocer a otras personas y participar en conversaciones. ` +
          `Sus intereses incluyen ${agent.interests && agent.interests.length > 0 ? agent.interests.join(", ") : "varios temas"}.`;

        // Crear el jugador (usando la estructura correcta de Player)
        const playerId = `p:${nextId}`;
        const player: any = {
          id: playerId,
          name: agent.name,
          character: "f1",
          position: { x: agent.x ?? 0, y: agent.y ?? 0 },
          activity: undefined,
          pathfinding: undefined,
          lastInput: Date.now(),
          facing: { x: 0, y: -1 },
          speed: 0,
        };

        // Crear el agente
        const agentId = `a:${nextId + 1}`;
        const newAgent = {
          id: agentId,
          playerId: playerId,
          inProgressOperation: undefined,
          lastConversation: undefined,
          lastInviteAttempt: undefined,
          toRemember: undefined,
        };

        // Actualizar el mundo
        const updatedWorld = {
          ...world,
          nextId: nextId + 2,
          players: [...world.players, player],
          agents: [...world.agents, newAgent],
        };

        // Guardar el mundo actualizado
        await ctx.db.replace(world._id, updatedWorld);

        // Crear la descripción del agente
        await ctx.db.insert("agentDescriptions", {
          worldId: world._id,
          agentId: agentId,
          identity: identity,
          plan: plan,
        });

        // Eliminar el agente de panelAgents
        await ctx.db.delete(agent._id);

        migrated++;
        nextId += 2;
        processedInBatch++;
      }

      // Si no procesamos ningún agente en este batch, hemos terminado
      if (processedInBatch === 0) {
        break;
      }
    }

    console.log(`✓ ${migrated} agentes migrados directamente a aiTown`);

    return {
      migrated,
      total: migrated,
      worldId: worldStatus.worldId,
      nextId,
    };
  },
});

// ============================================================================
// FUNCIONES PARA ARQUITECTURA ESCALABLE (WRAPPER)
// ============================================================================

/**
 * Query para contar agentes en la tabla escalable
 */
export const countScalableAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(internal.aiTown.scalableMigration.countScalableAgents, {});
  },
});

/**
 * Query para obtener el estado de la migración escalable
 */
export const getScalableMigrationStatus = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(internal.aiTown.scalableMigration.getScalableMigrationStatus, {});
  },
});

/**
 * Query para obtener el estado de las zonas
 */
export const getZonesStatus = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(internal.aiTown.scalableMigration.getZonesStatus, {});
  },
});

/**
 * Mutación para crear zonas
 * SOLO ADMINISTRADORES pueden crear zonas
 */
export const createZones = mutation({
  args: {
    gridSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} creando zonas...`);
    
    return await ctx.runMutation(internal.aiTown.scalableMigration.createZones, {
      gridSize: args.gridSize,
    });
  },
});

/**
 * Mutación para cargar 10k agentes en arquitectura escalable
 * SOLO ADMINISTRADORES pueden cargar agentes
 */
export const load10kAgents = mutation({
  args: {
    agents: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} cargando 10k agentes...`);
    
    return await ctx.runMutation(internal.aiTown.scalableMigration.load10kAgents, {
      agents: args.agents,
    });
  },
});

/**
 * Mutación para limpiar el documento worlds
 * SOLO ADMINISTRADORES pueden limpiar el documento worlds
 */
export const clearWorldsDocument = mutation({
  args: {},
  handler: async (ctx) => {
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} limpiando documento worlds...`);
    
    return await ctx.runMutation(internal.aiTown.scalableMigration.clearWorldsDocument, {});
  },
});

// ============================================================================
// FUNCIONES PARA CARGAR DICCIONARIO (WRAPPER)
// ============================================================================

/**
 * Mutación PÚBLICA para cargar el diccionario
 * SOLO ADMINISTRADORES pueden cargar el diccionario
 */
export const loadDictionary = mutation({
  args: {
    entries: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden cargar diccionario
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} cargando diccionario...`);
    
    return await ctx.runMutation(internal.aiTown.scalableMigration.loadDictionary, {
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
    return await ctx.runQuery(internal.aiTown.scalableMigration.getDictionary, {
      category: args.category,
    });
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
    return await ctx.runQuery(internal.aiTown.scalableMigration.getLabel, {
      field: args.field,
      code: args.code,
    });
  },
});

/**
 * Mutación PÚBLICA para limpiar el diccionario
 * SOLO ADMINISTRADORES pueden limpiar el diccionario
 */
export const clearDictionary = mutation({
  args: {},
  handler: async (ctx) => {
    // VERIFICACIÓN DE SEGURIDAD: Solo administradores pueden limpiar diccionario
    const adminEmail = await requireAdminMutation(ctx);
    console.log(`🔐 Admin ${adminEmail} limpiando diccionario...`);
    
    return await ctx.runMutation(internal.aiTown.scalableMigration.clearDictionary, {});
  },
});

// Mutación INTERNA para migrar agentes desde panelAgents usando el motor del juego
// Sin autenticación para uso con scripts locales
// Esta versión crea inputs createAgentFromData que el motor procesará
// Y elimina los agentes migrados de panelAgents para evitar duplicados
export const migrateAgentsToAiTownInternal = internalMutation({
  args: {
    limit: v.optional(v.number()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 Migrando agentes desde panelAgents usando el motor...`);
    
    // Obtener el mundo por defecto
    const worldStatus = await ctx.db
      .query("worldStatus")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    
    if (!worldStatus) {
      throw new Error("No se encontró el mundo por defecto");
    }

    // Obtener el engine
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error("No se encontró el engine");
    }

    const batchSize = args.batchSize || 50;
    const limit = args.limit || 100;
    
    // Obtener el siguiente número de input
    const prevInput = await ctx.db
      .query("inputs")
      .withIndex("byInputNumber", (q) => q.eq("engineId", engine._id))
      .order("desc")
      .first();
    let nextInputNumber = prevInput ? prevInput.number + 1 : 0;
    
    let migrated = 0;
    const playerIdsToDelete: string[] = [];

    while (migrated < limit) {
      // Obtener un lote de agentes desde panelAgents
      // Usamos take() que es eficiente y no lee todos los documentos
      const batch = await ctx.db.query("panelAgents").take(batchSize);
      
      if (batch.length === 0) {
        break;
      }

      // Procesar agentes en este lote
      let processedInBatch = 0;
      for (const agent of batch) {
        if (migrated >= limit) {
          break;
        }

        // Crear una descripción basada en los datos del agente
        const identity = `${agent.name} es una persona de ${agent.age} años de ${agent.comuna}, ${agent.region}. ` +
          `Pertenece al grupo socioeconómico ${agent.gse}. ` +
          (agent.sex ? `Sexo: ${agent.sex}. ` : "") +
          (agent.p23_est_civil ? `Estado civil: ${agent.p23_est_civil}. ` : "") +
          (agent.escolaridad ? `Escolaridad: ${agent.escolaridad}. ` : "") +
          (agent.sit_fuerza_trabajo ? `Situación laboral: ${agent.sit_fuerza_trabajo}. ` : "") +
          (agent.politicalLeaning !== undefined ? `Inclinación política: ${agent.politicalLeaning}. ` : "") +
          (agent.interests && agent.interests.length > 0 ? `Intereses: ${agent.interests.join(", ")}. ` : "");

        const plan = `${agent.name} está explorando el mundo virtual de aiTown. ` +
          `Le interesa conocer a otras personas y participar en conversaciones. ` +
          `Sus intereses incluyen ${agent.interests && agent.interests.length > 0 ? agent.interests.join(", ") : "varios temas"}.`;

        // Insertar un input createAgentFromData
        await ctx.db.insert("inputs", {
          engineId: engine._id,
          number: nextInputNumber,
          name: "createAgentFromData",
          args: {
            name: agent.name,
            character: "f1",
            identity: identity,
            plan: plan,
            x: agent.x,
            y: agent.y,
            agentData: {
              age: agent.age,
              sex: agent.sex,
              region: agent.region,
              comuna: agent.comuna,
              gse: agent.gse,
              politicalLeaning: agent.politicalLeaning,
              interests: agent.interests,
              playerId: agent.playerId,
            },
          },
          received: Date.now(),
        });

        // Guardar el playerId para eliminar después
        playerIdsToDelete.push(agent.playerId);
        
        // Eliminar el agente inmediatamente
        await ctx.db.delete(agent._id);

        migrated++;
        nextInputNumber++;
        processedInBatch++;
      }

      // Si no procesamos ningún agente en este batch, hemos terminado
      if (processedInBatch === 0) {
        break;
      }
    }

    console.log(`✓ ${migrated} agentes migrados y eliminados de panelAgents`);

    return {
      migrated,
      total: migrated,
      worldId: worldStatus.worldId,
      engineId: engine._id,
    };
  },
});
