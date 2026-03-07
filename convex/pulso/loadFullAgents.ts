import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Mutación para cargar agentes completos en lote
export const loadFullAgents = mutation({
  args: {
    agents: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    for (const agent of args.agents) {
      await ctx.db.insert("agentsFull", agent);
      inserted++;
    }
    return { inserted };
  },
});
