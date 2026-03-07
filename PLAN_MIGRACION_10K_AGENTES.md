# Plan de Migración: 10,000 Agentes con Nuevas Categorías GSE

## Objetivo
Reemplazar los agentes actuales en la base de datos Convex con los 10,000 nuevos agentes generados que incluyen las nuevas categorías de GSE (AB, C1a, C1b, C2, C3, D, E).

## Fuente de Datos
- **Archivo**: `base_agentes/v2/agents_seed_labeled.json`
- **Total agentes**: 10,000
- **Formato**: JSON con campos etiquetados

## Distribución GSE de los 10,000 Agentes

| GSE | Cantidad | Porcentaje | Descripción |
|-----|----------|------------|-------------|
| AB | 180 | 1.80% | Élite Alta |
| C1a | 640 | 6.40% | Clase Media Acomodada |
| C1b | 830 | 8.30% | Clase Media Emergente |
| C2 | 1,350 | 13.50% | Clase Media Típica |
| C3 | 2,280 | 22.80% | Clase Media Baja |
| D | 3,460 | 34.60% | Vulnerable |
| E | 1,260 | 12.60% | Pobreza Extrema |

## Agentes Visibles
- **Total visibles**: 467 (4.67% del total)
- Solo los agentes con `isVisible: true` aparecerán en el mapa

---

## Pasos de Migración

### Paso 1: Backup de Datos Actuales (Opcional pero recomendado)
```bash
# Exportar agentes actuales antes de borrarlos
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:exportAllAgents > backup_agents_$(date +%Y%m%d).json
```

### Paso 2: Limpiar Agentes Existentes
Ejecutar mutación para limpiar todos los agentes de `panelAgents` y `agentsFull`:
```bash
node scripts/clearAllAgents.js
```

### Paso 3: Transformar Nuevos Agentes
El script de transformación convertirá el formato de `agents_seed_labeled.json` al formato esperado por Convex:
```bash
node scripts/transform10kAgents.js
```

### Paso 4: Cargar Nuevos Agentes
Cargar los agentes transformados en lotes de 100:
```bash
node scripts/load10kAgents.js
```

### Paso 5: Verificar Carga
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:countAgents
```

---

## Scripts a Crear

### 1. `scripts/transform10kAgents.js`
- Lee `base_agentes/v2/agents_seed_labeled.json`
- Transforma cada agente al formato de `panelAgents`
- Mantiene todos los campos demográficos
- Calcula `politicalLeaning` basado en GSE
- Genera `interests` basados en perfil demográfico
- Asigna coordenadas (x, y) aleatorias
- Guarda resultado en `agents_10k_transformed.json`

### 2. `scripts/load10kAgents.js`
- Lee `agents_10k_transformed.json`
- Carga agentes en lotes de 100 usando `bulkInsertPublic`
- Muestra progreso de carga
- Maneja errores y reintentos

### 3. `scripts/clearAllAgents.js`
- Limpia tabla `panelAgents`
- Limpia tabla `agentsFull`
- Opcional: limpia `agentDescriptions` y `playerDescriptions`

---

## Formato de Salida Esperado

Cada agente transformado tendrá esta estructura:

```json
{
  "playerId": "p:1",
  "id_global": "9975244",
  "id_vivienda": "4141683",
  "id_hogar": "1",
  "id_persona": "3",
  "name": "Agente_1",
  "age": 29,
  "sex": "1",
  "age_group": "18-29",
  "region": "Arica y Parinacota",
  "provincia": "151",
  "comuna": "15101",
  "gse": "AB",
  "politicalLeaning": 25,
  "interests": ["política", "economía", "cultura"],
  "worldId": "<world_id>",
  "isVisible": false,
  "x": 512,
  "y": 384,
  // ... todos los campos demográficos adicionales
}
```

---

## Comandos de Verificación

### Contar agentes por GSE
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:countAgentsByGSE
```

### Contar agentes visibles
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:countVisibleAgents
```

### Ver distribución de edades
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:getAgeDistribution
```

### Ver distribución por región
```bash
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:getRegionDistribution
```

---

## Cronograma Estimado

| Paso | Tiempo Estimado |
|------|-----------------|
| Backup (opcional) | 2-5 minutos |
| Limpieza | 1-2 minutos |
| Transformación | 30-60 segundos |
| Carga (10,000 agentes) | 5-10 minutos |
| Verificación | 1-2 minutos |
| **Total** | **~15-20 minutos** |

---

## Riesgos y Mitigación

| Riesgo | Mitigación |
|--------|------------|
| Pérdida de datos | Backup previo obligatorio |
| Timeout en carga | Usar lotes pequeños (100) |
| Datos inconsistentes | Validar formato antes de cargar |
| Límite de tasa API | Pausa entre lotes (2 segundos) |

---

## Criterios de Éxito

- [ ] 10,000 agentes cargados en `panelAgents`
- [ ] Distribución GSE exacta según tabla maestra
- [ ] 467 agentes visibles (4.67%)
- [ ] Todos los campos demográficos presentes
- [ ] Coordenadas (x, y) válidas dentro del mapa
- [ ] Variable `tiene_internet` = 100% true

---

## Notas Importantes

1. **Seguridad**: Todas las mutaciones están protegidas con `requireAdminMutation`
2. **Lotes**: La carga se hace en lotes de 100 para evitar límites de Convex
3. **Validación**: El script valida cada agente antes de cargar
4. **Reintentos**: El script maneja errores automáticamente