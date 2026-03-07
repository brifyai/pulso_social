#!/usr/bin/env node

import { ConvexHttpClient } from 'convex/browser';

// Configuración
const DEPLOYMENT_URL = 'https://energetic-cuttlefish-560.convex.cloud';
const BATCH_LIMIT = 100; // Agentes por lote
const TOTAL_AGENTS = 9908; // Total de agentes a migrar

async function migrateBatch(client, offset, limit) {
  console.log(`Migrando agentes ${offset + 1} a ${offset + limit}...`);
  
  try {
    const result = await client.mutation('pulso/agents:migrateAgentsDirectly', {
      limit: limit,
      batchSize: 25,
      offset: offset,
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
  console.log(`Tamaño de lote: ${BATCH_LIMIT}`);
  console.log('');

  const client = new ConvexHttpClient(DEPLOYMENT_URL);
  
  let totalMigrated = 0;
  let currentBatch = 0;
  
  while (totalMigrated < TOTAL_AGENTS) {
    const remaining = TOTAL_AGENTS - totalMigrated;
    const batchSize = Math.min(BATCH_LIMIT, remaining);
    
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