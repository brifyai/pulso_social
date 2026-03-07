"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import fs from "fs";
import readline from "readline";
import path from "path";

// Acción interna para cargar agentes desde el archivo agents.jsonl
export const loadAgentsFromFile = internalAction({
  args: {},
  handler: async (ctx) => {
    const filePath = path.join(process.cwd(), "agents.jsonl");
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`No se encontró el archivo: ${filePath}`);
    }

    // Obtener el worldId por defecto usando una query
    const worldId = await ctx.runQuery(internal.pulso.agents.getDefaultWorldIdInternal, {});
    console.log(`🌍 Usando worldId: ${worldId}`);

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let count = 0;
    const BATCH_SIZE = 500;
    let batch: any[] = [];

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const raw = JSON.parse(line);

        // MAPEO DE CAMPOS - Ajustado al schema de panelAgents
        const cleanAgent = {
          playerId: raw.id || `p:${count}`,
          name: raw.name || `Ciudadano ${count}`,
          age: Number(raw.edad || raw.age || 30),
          gse: raw.gse || "C2",
          region: raw.region || "Metropolitana",
          comuna: raw.comuna || "Santiago",
          politicalLeaning: Math.floor(Math.random() * 200) - 100, // -100 a 100
          interests: ["NACIONAL"], // Default
          worldId: worldId,
          isVisible: raw.isVisible !== undefined ? raw.isVisible : Math.random() < 0.05,
          x: 32 + Math.floor(Math.random() * 10),
          y: 32 + Math.floor(Math.random() * 10),
        };

        batch.push(cleanAgent);

        // Insertar lote cuando llegue a 500
        if (batch.length >= BATCH_SIZE) {
          await ctx.runMutation(internal.pulso.agents.bulkInsertPanelAgentsInternal, { agents: batch });
          count += batch.length;
          console.log(`✅ Cargados: ${count}`);
          batch = [];
        }
      } catch (err) {
        console.warn("⚠️ Error procesando una línea:", err);
      }
    }

    // Insertar el resto
    if (batch.length > 0) {
      await ctx.runMutation(internal.pulso.agents.bulkInsertPanelAgentsInternal, { agents: batch });
      count += batch.length;
      console.log(`✅ Cargados finales: ${count}`);
    }

    return { loaded: count };
  },
});
