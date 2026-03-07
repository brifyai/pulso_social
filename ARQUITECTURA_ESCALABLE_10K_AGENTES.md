# Arquitectura Escalable para 10,000 Agentes

## Problemas Actuales Identificados

### 1. Límite de Documento Único (1 MiB)
- **Problema**: Todo el estado del mundo (jugadores, agentes, conversaciones) está en un solo documento `worlds`
- **Límite**: Convex tiene un límite de 1 MiB por documento
- **Estado actual**: ~1048245 bytes con solo 6,670 agentes
- **Proyección**: 10,000 agentes necesitarían ~1.5-2 MiB

### 2. Carga Completa en Memoria
- **Problema**: `Game.load()` carga TODOS los agentes y jugadores en memoria
- **Impacto**: Cada paso del motor procesa todos los agentes, incluso los inactivos

### 3. Procesamiento Síncrono
- **Problema**: Todos los agentes se procesan en cada tick (16ms)
- **Límite**: 32-128 inputs por paso, 1 segundo por paso
- **Cuello de botella**: Agentes inactivos consumen recursos

## Solución Propuesta: Arquitectura Distribuida

### 1. Sistema de Zonas/Regiones

```
┌─────────────────────────────────────────────────────────┐
│                    MUNDO PRINCIPAL                       │
│  (solo metadata, estadísticas, configuración)           │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼───────┐  ┌────────▼────────┐
│   ZONA_NORTE   │  │ ZONA_CENTRO  │  │   ZONA_SUR      │
│  (doc separado)│  │ (doc separado)│  │  (doc separado) │
│  ~500 agentes  │  │  ~500 agentes │  │  ~500 agentes   │
└────────────────┘  └───────────────┘  └─────────────────┘
```

**Implementación**:
- Crear tabla `zones` con documentos separados
- Cada zona tiene su propio array de jugadores/agentes
- Límite de ~500-1000 agentes por zona
- Jugadores pueden moverse entre zonas

### 2. Agentes como Documentos Separados

```typescript
// Nueva tabla: agents
{
  _id: Id<"agents">,
  worldId: Id<"worlds">,
  zoneId: Id<"zones">,
  playerId: string,
  name: string,
  position: { x: number, y: number },
  status: "idle" | "active" | "conversation",
  lastActive: number,
  // ... resto de campos
}
```

**Ventajas**:
- Sin límite de 1 MiB (cada agente es un documento)
- Queries eficientes por zona/estado
- Se pueden archivar agentes inactivos fácilmente

### 3. Motor de Procesamiento por Lotes

```typescript
// En lugar de procesar todos los agentes cada tick:
class ZoneEngine {
  // Solo procesa agentes activos en esta zona
  async processActiveAgents(zoneId: Id<"zones">) {
    const activeAgents = await ctx.db
      .query("agents")
      .withIndex("zone_status", (q) => 
        q.eq("zoneId", zoneId).eq("status", "active")
      )
      .take(MAX_ACTIVE_PER_STEP);
    
    for (const agent of activeAgents) {
      await this.processAgent(agent);
    }
  }
}
```

### 4. Sistema de Activación/Desactivación

```
Agente Inactivo → Evento → Agente Activo → 5 min sin actividad → Agente Inactivo

- Inactivo: Solo existe, no se procesa en ticks
- Activo: Se procesa normalmente (movimiento, conversaciones)
- Activación: Por proximidad a jugadores o eventos
```

### 5. Conversaciones como Documentos Separados

```typescript
// Nueva tabla: conversations
{
  _id: Id<"conversations">,
  worldId: Id<"worlds">,
  zoneId: Id<"zones">,
  participants: Id<"players">[],
  messages: Message[],
  created: number,
  lastMessage: number,
  status: "active" | "ended",
}
```

## Plan de Implementación

### Fase 1: Nueva Estructura de Datos (2-3 días)

1. **Modificar schema.ts**:
```typescript
export default defineSchema({
  // ... existente
  zones: defineTable({
    worldId: id("worlds"),
    name: v.string(),
    bounds: v.object({ x: number, y: number, width: number, height: number }),
    agentIds: v.array(id("agents")),
    playerIds: v.array(id("players")),
  }).index("worldId", ["worldId"]),
  
  agents: defineTable({
    worldId: id("worlds"),
    zoneId: id("zones"),
    playerId: v.string(),
    name: v.string(),
    position: v.object({ x: v.number(), y: v.number() }),
    status: v.union(v.literal("idle"), v.literal("active"), v.literal("conversation")),
    lastActive: v.number(),
    // ... campos existentes
  })
    .index("worldId", ["worldId"])
    .index("zoneId", ["zoneId"])
    .index("zone_status", ["zoneId", "status"])
    .index("status", ["status"]),
  
  // ... similar para players, conversations
});
```

### Fase 2: Migración de Datos (1-2 días)

2. **Script de migración**:
```typescript
// Migrar agentes del documento worlds a tabla separada
export const migrateAgentsToTable = mutation({
  handler: async (ctx) => {
    const world = await ctx.db.query("worlds").first();
    
    // Crear zonas
    const zones = createZones(world);
    for (const zone of zones) {
      await ctx.db.insert("zones", zone);
    }
    
    // Migrar agentes
    for (const agent of world.agents) {
      const zone = findZoneForAgent(agent.position, zones);
      await ctx.db.insert("agents", {
        ...agent,
        zoneId: zone._id,
        status: "idle", // Empezar todos como inactivos
      });
    }
  }
});
```

### Fase 3: Nuevo Motor por Zonas (3-4 días)

3. **Modificar game.ts**:
```typescript
export class ZoneGame {
  zoneId: Id<"zones">;
  agents: Map<GameId<"agents">, Agent>;
  players: Map<GameId<"players">, Player>;
  
  // Solo procesa agentes activos
  tick(now: number) {
    const activeAgents = Array.from(this.agents.values())
      .filter(a => a.status === "active");
    
    for (const agent of activeAgents) {
      agent.tick(this, now);
    }
  }
}
```

### Fase 4: Sistema de Activación (2-3 días)

4. **Activación por proximidad**:
```typescript
export const activateNearbyAgents = mutation({
  args: { playerId: v.string(), radius: v.number() },
  handler: async (ctx, args) => {
    const player = await getPlayer(ctx, args.playerId);
    const nearbyAgents = await ctx.db
      .query("agents")
      .withIndex("zone_status", (q) => 
        q.eq("zoneId", player.zoneId).eq("status", "idle")
      )
      .filter((q) => 
        q.and(
          q.gte(q.field("position", "x"), player.position.x - args.radius),
          q.lte(q.field("position", "x"), player.position.x + args.radius),
          // ... similar para y
        )
      )
      .take(MAX_ACTIVE_PER_ZONE);
    
    for (const agent of nearbyAgents) {
      await ctx.db.patch(agent._id, { status: "active", lastActive: Date.now() });
    }
  }
});
```

### Fase 5: Limpieza de Inactivos (1 día)

5. **Cron job para desactivar**:
```typescript
// convex/crons.ts
export default defineCronJobs({
  deactivateInactiveAgents: defineCronJob({
    schedule: "*/5 * * * *", // Cada 5 minutos
    handler: internal.pulso.agents.deactivateInactiveAgents,
  }),
});

// convex/pulso/agents.ts
export const deactivateInactiveAgents = internalMutation({
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const inactiveAgents = await ctx.db
      .query("agents")
      .withIndex("status", (q) => q.eq("status", "active"))
      .filter((q) => q.lt(q.field("lastActive"), fiveMinutesAgo))
      .collect();
    
    for (const agent of inactiveAgents) {
      await ctx.db.patch(agent._id, { status: "idle" });
    }
  }
});
```

## Beneficios de la Nueva Arquitectura

| Métrica | Actual | Nueva |
|---------|--------|-------|
| Agentes máximos | ~7,000 | 50,000+ |
| Tamaño documento | 1 MiB (límite) | ~50KB por zona |
| Procesamiento por tick | Todos | Solo activos (~5%) |
| Memoria requerida | Alta | Baja/Media |
| Escalabilidad | Vertical | Horizontal |

## Estimación de Recursos

### Para 10,000 agentes:
- **Zonas necesarias**: 10-20 zonas (500-1000 agentes cada una)
- **Agentes activos típicos**: 5% = 500 agentes
- **Procesamiento por tick**: 500 agentes vs 10,000 actuales
- **Mejora**: 20x más eficiente

## Migración Gradual

1. **Semana 1**: Implementar nueva estructura de datos
2. **Semana 2**: Migrar datos existentes
3. **Semana 3**: Implementar motor por zonas
4. **Semana 4**: Sistema de activación/desactivación
5. **Semana 5**: Pruebas y optimización

## Conclusión

La arquitectura actual no puede soportar 10,000 agentes debido a:
1. Límite de 1 MiB por documento
2. Procesamiento síncrono de todos los agentes
3. Carga completa en memoria

La solución propuesta usa:
1. **Documentos separados** para agentes
2. **Sistema de zonas** para dividir el mundo
3. **Activación selectiva** para reducir procesamiento
4. **Procesamiento por lotes** para eficiencia

Esta arquitectura es común en MMOs y juegos de simulación a gran escala.