#!/usr/bin/env node

import { ConvexHttpClient } from 'convex/browser';

// Configuración
const DEPLOYMENT_URL = 'https://energetic-cuttlefish-560.convex.cloud';
const BATCH_SIZE = 100; // Agentes por lote
const TOTAL_TO_MIGRATE = 3500; // Agentes restantes por migrar

async function migrateBatch(client, limit, batchSize) {
  console.log(`Migrando ${batchSize} agentes (límite: ${limit})...`);
  
  try {
    const result = await client.mutation('pulso/agents:migrateAgentsToAiTown', {
      limit: limit,
      batchSize: 50,
    });
    
    console.log(`✓ Migrados ${result.migrated} agentes en este lote`);
    return result;
  } catch (error) {
    console.error(`✗ Error migrando lote:`, error.message);
    return { migrated: 0, cursor: null };
  }
}

async function main() {
  console.log('Iniciando migración de agentes restantes a aiTown...');
  console.log(`Total de agentes a migrar: ${TOTAL_TO_MIGRATE}`);
  console.log(`Tamaño de lote: ${BATCH_SIZE}`);
  console.log('');

  const client = new ConvexHttpClient(DEPLOYMENT_URL);
  
  let totalMigrated = 0;
  let currentBatch = 0;
  
  while (totalMigrated < TOTAL_TO_MIGRATE) {
    const remaining = TOTAL_TO_MIGRATE - totalMigrated;
    const batchSize = Math.min(BATCH_SIZE, remaining);
    
    const result = await migrateBatch(client, batchSize, batchSize);
    
    if (result.migrated === 0) {
      console.error('Error: No se pudo migrar el lote. Abortando.');
      process.exit(1);
    }
    
    totalMigrated += result.migrated;
    currentBatch++;
    
    console.log(`Progreso: ${totalMigrated}/${TOTAL_TO_MIGRATE} agentes migrados`);
    
    // Pequeña pausa entre lotes para evitar sobrecargar el servidor
    if (totalMigrated < TOTAL_TO_MIGRATE) {
      console.log('Esperando 1 segundo antes del siguiente lote...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('');
  console.log('✓ Migración completada exitosamente!');
  console.log(`Total de agentes migrados: ${totalMigrated}`);
  console.log(`Lotes procesados: ${currentBatch}`);
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});