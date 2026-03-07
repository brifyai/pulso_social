# Solución para Migrar Agentes de agentsFull a aiTown

## Análisis del Problema

### Estado Actual
- **Total de agentes en `agentsFull`**: 9,908 agentes con 78 campos cada uno
- **Agentes migrados a aiTown**: 505 agentes
- **Inputs de migración creados**: Más de 32,000 inputs (incluyendo intentos anteriores)
- **Inputs procesados por el motor**: 24,230 inputs
- **Estado del motor**: Corriendo pero procesando inputs lentamente

### Arquitectura de aiTown
En aiTown, los agentes NO se almacenan en una tabla separada. En su lugar:
- Los agentes se almacenan dentro del documento `worlds` como un array
- Las descripciones de los agentes se almacenan en la tabla `agentDescriptions`
- Los jugadores se almacenan dentro del documento `worlds` como un array
- Las descripciones de los jugadores se almacenan en la tabla `playerDescriptions`

### Limitaciones del Motor del Juego
El motor del juego tiene las siguientes limitaciones:
- `maxInputsPerStep = 32`: Solo procesa 32 inputs por paso
- `stepDuration = 1000ms`: Cada paso dura 1 segundo
- `maxTicksPerStep = 600`: Máximo 600 ticks por paso
- **Velocidad máxima de procesamiento**: 32 inputs por segundo

### Problema Identificado
Hay 290 inputs de tipo "finishDoSomething" antes del primer input de migración (número 24521). El motor debe procesar estos inputs antes de llegar a los inputs de migración. A una velocidad de 32 inputs por segundo, esto toma aproximadamente 9 segundos.

## Solución Propuesta

### Opción 1: Esperar a que el motor procese los inputs pendientes
**Ventajas:**
- No requiere cambios en el código
- Los agentes se migrarán automáticamente

**Desventajas:**
- Toma mucho tiempo (aproximadamente 9 segundos por cada 290 inputs)
- Hay miles de inputs pendientes

**Tiempo estimado:**
- Inputs pendientes: ~8,000 inputs
- Velocidad: 32 inputs/segundo
- Tiempo total: ~250 segundos (~4 minutos)

### Opción 2: Aumentar el límite de inputs por paso (RECOMENDADA)
**Ventajas:**
- Acelera significativamente el procesamiento
- No requiere cambios en la lógica de migración

**Desventajas:**
- Requiere modificar el código del juego
- Puede aumentar el uso de recursos

**Implementación:**
1. Modificar `convex/aiTown/game.ts`:
   ```typescript
   maxInputsPerStep = 128; // Aumentar de 32 a 128
   ```

2. Desplegar los cambios:
   ```bash
   CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex dev --once
   ```

3. El motor procesará 4 veces más rápido (128 inputs/segundo)

**Tiempo estimado:**
- Inputs pendientes: ~8,000 inputs
- Velocidad: 128 inputs/segundo
- Tiempo total: ~62 segundos (~1 minuto)

### Opción 3: Crear agentes directamente en el mundo (ALTERNATIVA)
**Ventajas:**
- No depende del motor del juego
- Migración instantánea

**Desventajas:**
- Requiere crear una mutación especial
- Los agentes no tendrán el historial de inputs

**Implementación:**
1. Crear una mutación que inserte agentes directamente en el documento `worlds`
2. Crear las descripciones en la tabla `agentDescriptions`
3. Crear los jugadores en el documento `worlds`
4. Crear las descripciones en la tabla `playerDescriptions`

## Pasos para Implementar la Solución (Opción 2)

### Paso 1: Modificar el límite de inputs por paso
Archivo: `convex/aiTown/game.ts`

```typescript
export class Game extends AbstractGame {
  tickDuration = 16;
  stepDuration = 1000;
  maxTicksPerStep = 600;
  maxInputsPerStep = 128; // Cambiar de 32 a 128
  // ...
}
```

### Paso 2: Desplegar los cambios
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex dev --once
```

### Paso 3: Verificar el progreso
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:countAiTownAgents
```

### Paso 4: Esperar a que se procesen todos los inputs
El motor procesará los inputs pendientes y creará los agentes automáticamente.

## Pasos para Implementar la Solución (Opción 3)

### Paso 1: Crear una mutación para migrar agentes directamente
Archivo: `convex/pulso/agents.ts`

```typescript
// Mutación para migrar agentes directamente al mundo
export const migrateAgentsDirectly = mutation({
  args: {
    limit: v.optional(v.number()),
    batchSize: v.optional(v.number()),
    offset: v.optional(v.number()),
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

    // Obtener el mundo
    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) {
      throw new Error("No se encontró el mundo");
    }

    const batchSize = args.batchSize || 100;
    const limit = args.limit || 100;
    const offset = args.offset || 0;
    
    let migrated = 0;
    let skipped = 0;
    let cursor: any = null;

    while (migrated < limit) {
      // Obtener un lote de agentes usando paginación
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

        // Saltar los primeros 'offset' agentes
        if (skipped < offset) {
          skipped++;
          cursor = agent.playerId;
          continue;
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

        // Crear el jugador
        const playerId = `p:${world.nextId}`;
        const player = {
          id: playerId,
          name: agent.name,
          character: "f1",
          position: { x: agent.x ?? 0, y: agent.y ?? 0 },
          activity: null,
          pathfinding: null,
        };

        // Crear el agente
        const agentId = `a:${world.nextId + 1}`;
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
          nextId: world.nextId + 2,
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

        migrated++;
        cursor = agent.playerId;
      }

      if (batch.length < batchSize) {
        break; // Último lote
      }
    }

    return {
      migrated,
      skipped,
      total: migrated,
      worldId: worldStatus.worldId,
    };
  },
});
```

### Paso 2: Crear un script para ejecutar la migración
Archivo: `scripts/migrateAgentsDirectly.js`

```javascript
#!/usr/bin/env node

import { ConvexHttpClient } from 'convex/browser';

// Configuración
const DEPLOYMENT_URL = 'https://energetic-cuttlefish-560.convex.cloud';
const BATCH_SIZE = 500; // Agentes por lote
const TOTAL_AGENTS = 9908; // Total de agentes a migrar

async function migrateBatch(client, start, count) {
  console.log(`Migrando agentes ${start + 1} a ${start + count}...`);
  
  try {
    const result = await client.mutation('pulso/agents:migrateAgentsDirectly', {
      limit: count,
      batchSize: 50,
      offset: start,
    });
    
    console.log(`✓ Migrados ${result.migrated} agentes en este lote`);
    return result.migrated;
  } catch (error) {
    console.error(`✗ Error migrando lote:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('Iniciando migración directa de agentes a aiTown...');
  console.log(`Total de agentes: ${TOTAL_AGENTS}`);
  console.log(`Tamaño de lote: ${BATCH_SIZE}`);
  console.log('');

  const client = new ConvexHttpClient(DEPLOYMENT_URL);
  
  let totalMigrated = 0;
  let currentBatch = 0;
  
  while (totalMigrated < TOTAL_AGENTS) {
    const remaining = TOTAL_AGENTS - totalMigrated;
    const batchSize = Math.min(BATCH_SIZE, remaining);
    
    const migrated = await migrateBatch(client, totalMigrated, batchSize);
    
    if (migrated === 0) {
      console.error('Error: No se pudo migrar el lote. Abortando.');
      process.exit(1);
    }
    
    totalMigrated += migrated;
    currentBatch++;
    
    console.log(`Progreso: ${totalMigrated}/${TOTAL_AGENTS} agentes migrados`);
    
    // Pequeña pausa entre lotes para evitar sobrecargar el servidor
    if (totalMigrated < TOTAL_AGENTS) {
      console.log('Esperando 2 segundos antes del siguiente lote...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('');
  console.log('✓ Migración completada exitosamente!');
  console.log(`Total de agentes migrados: ${totalMigrated}`);
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
```

### Paso 3: Ejecutar el script
```bash
node scripts/migrateAgentsDirectly.js
```

## Recomendación

**Recomiendo la Opción 2 (Aumentar el límite de inputs por paso)** porque:
1. Es la solución más simple
2. No requiere cambios en la lógica de migración
3. Los agentes se migrarán automáticamente
4. El tiempo de migración es razonable (~1 minuto)

Si la Opción 2 no funciona o toma demasiado tiempo, se puede implementar la Opción 3 como alternativa.

## Comandos Útiles

### Verificar el estado del motor
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:getSimpleEngineStatus
```

### Verificar el número de agentes en aiTown
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:countAiTownAgents
```

### Verificar los inputs pendientes
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:analyzePendingInputs
```

### Verificar la posición de los inputs de migración
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:findMigrationInputsPosition
```

### Reiniciar el motor
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:kickEngine
```

## Archivos Modificados

1. `convex/aiTown/agentInputs.ts` - Agregado handler `createAgentFromData`
2. `convex/pulso/agents.ts` - Agregadas mutaciones y queries para migración
3. `scripts/migrateAgentsToAiTown.js` - Script para ejecutar la migración
4. `convex/pulso/schema.ts` - Actualizado para permitir valores null

## Próximos Pasos

1. Implementar la Opción 2 (Aumentar el límite de inputs por paso)
2. Verificar que el motor procesa los inputs más rápido
3. Esperar a que se procesen todos los inputs de migración
4. Verificar que todos los 9,908 agentes se han migrado correctamente
5. Probar que los agentes funcionan correctamente en aiTown
