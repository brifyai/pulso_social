import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Mutación para actualizar agentes con campos adicionales
export const updateAgentsWithFullData = mutation({
  args: {
    agents: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    let updated = 0;
    for (const agentData of args.agents) {
      const existing = await ctx.db
        .query("panelAgents")
        .withIndex("playerId", (q) => q.eq("playerId", agentData.playerId))
        .first();
      
      if (existing) {
        // Actualizar el documento existente con todos los campos
        await ctx.db.patch(existing._id, agentData);
        updated++;
      } else {
        // Insertar nuevo documento
        await ctx.db.insert("panelAgents", agentData);
        updated++;
      }
    }
    return { updated };
  },
});
