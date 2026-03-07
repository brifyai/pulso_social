# Guía para Cargar Datos de Agentes en Convex

## Resumen de lo creado

### 1. Archivos de Scripts
- **`scripts/loadAgents.ts`**: Script principal para cargar agentes desde `agents.jsonl`
- **`scripts/fixAndLoad.ts`**: Script alternativo con mapeo de campos

### 2. Archivos de Convex
- **`convex/pulso/agents.ts`**: Contiene las mutaciones para insertar agentes
  - `bulkInsertPanelAgents`: Mutación pública para insertar en lote
  - `bulkInsertPublic`: Mutación pública temporal para carga masiva
  - `bulkInsertPanelAgentsInternal`: Mutación interna para uso interno
  - `getDefaultWorldId`: Query pública para obtener el worldId
  - `getDefaultWorldIdInternal`: Query interna para obtener el worldId
  - `clearPanelAgents`: Mutación para limpiar todos los agentes
  - `getAllPanelAgents`: Query para obtener todos los agentes
  - `getVisiblePanelAgents`: Query para obtener agentes visibles
  - `getPanelAgentsByRegion`: Query para obtener agentes por región
  - `getPanelAgentsByGSE`: Query para obtener agentes por GSE

- **`convex/pulso/load.ts`**: Acción interna para cargar desde archivo (usa Node.js runtime)

## Problema Actual

La función pública `bulkInsertPublic` no se está encontrando en el deployment de producción. Esto puede ser debido a:
1. El deploy no se completó correctamente
2. Hay un problema de caché en Convex
3. La función necesita ser regenerada

## Solución Recomendada

### Opción 1: Usar el Dashboard de Convex (Más Simple)

1. Ve al Dashboard de Convex: https://dashboard.convex.dev
2. Navega a tu proyecto: `master-brifyai`
3. Ve a la sección **Functions**
4. Busca la función `pulso:bulkInsertPublic`
5. Si no existe, haz un nuevo deploy desde el CLI:
   ```bash
   npx convex deploy --yes
   ```
6. Luego ejecuta el script:
   ```bash
   CONVEX_URL=https://hardy-ocelot-644.convex.cloud npx ts-node scripts/loadAgents.ts
   ```

### Opción 2: Usar el comando `npx convex import` (Alternativa)

Convex tiene un comando nativo para importar datos:

```bash
# Primero, convierte tu JSONL a JSON si es necesario
# Luego importa directamente:
npx convex import agents.jsonl --table panelAgents
```

### Opción 3: Usar la función desde el Dashboard

1. Ve al Dashboard de Convex
2. Navega a **Functions** > **pulso** > **bulkInsertPublic**
3. Haz clic en **Run Function**
4. Pega un array de agentes en el formato JSON
5. Ejecuta

## Formato de los Datos

El archivo `agents.jsonl` debe tener el siguiente formato por línea:

```json
{
  "id": "7198835",
  "name": "Agente_1",
  "edad": "21",
  "gse": "C2",
  "region": "Maule",
  "comuna": "Curicó",
  "isVisible": false
}
```

El script mapea estos campos al schema de `panelAgents`:

```typescript
{
  playerId: raw.id || `p:${count}`,
  name: raw.name || `Ciudadano ${count}`,
  age: Number(raw.edad || raw.age || 30),
  gse: raw.gse || "C2",
  region: raw.region || "Metropolitana",
  comuna: raw.comuna || "Santiago",
  politicalLeaning: Math.floor(Math.random() * 200) - 100,
  interests: ["NACIONAL"],
  worldId: worldId,
  isVisible: raw.isVisible !== undefined ? raw.isVisible : Math.random() < 0.05,
  x: 32 + Math.floor(Math.random() * 10),
  y: 32 + Math.floor(Math.random() * 10),
}
```

## Pasos para Completar la Carga

1. **Verificar el archivo de datos**:
   ```bash
   head -n 1 agents.jsonl
   ```

2. **Obtener el worldId** (si es necesario):
   - Ve al Dashboard de Convex
   - Navega a Tables > worlds
   - Copia el `_id` del mundo por defecto

3. **Ejecutar el script**:
   ```bash
   # Sin worldId (usará "world" por defecto)
   CONVEX_URL=https://hardy-ocelot-644.convex.cloud npx ts-node scripts/loadAgents.ts

   # Con worldId específico
   WORLD_ID=<tu-world-id> CONVEX_URL=https://hardy-ocelot-644.convex.cloud npx ts-node scripts/loadAgents.ts
   ```

4. **Verificar la carga**:
   - Ve al Dashboard de Convex
   - Navega a Tables > panelAgents
   - Deberías ver los agentes cargados

## Limpiar Datos (si es necesario)

Si necesitas borrar todos los agentes y volver a cargar:

```bash
npx convex run pulso:clearPanelAgents
```

## Notas Importantes

- El archivo `agents.jsonl` tiene 9,908 líneas (agentes)
- El script procesa en lotes de 500 agentes
- Aproximadamente 20 lotes para completar la carga
- El 5% de los agentes serán visibles en el mapa (`isVisible: true`)
- Los campos `politicalLeaning`, `x`, `y` se generan aleatoriamente

## Troubleshooting

### Error: "Could not find public function for 'pulso:bulkInsertPublic'"

1. Verifica que el deploy se completó:
   ```bash
   npx convex deploy --yes
   ```

2. Verifica las funciones disponibles:
   ```bash
   npx convex function-spec | grep pulso
   ```

3. Si la función no aparece, regenera el código:
   ```bash
   npx convex codegen
   npx convex deploy --yes
   ```

### Error: "No se encontró el mundo por defecto"

1. Ejecuta `npx convex run init` para crear el mundo por defecto
2. O especifica el `WORLD_ID` manualmente

## Archivos Creados/Modificados

- ✅ `scripts/loadAgents.ts` - Script de carga principal
- ✅ `scripts/fixAndLoad.ts` - Script alternativo
- ✅ `convex/pulso/agents.ts` - Mutaciones y queries para agentes
- ✅ `convex/pulso/load.ts` - Acción interna para carga desde archivo
- ✅ `CARGA_DATOS.md` - Este documento
