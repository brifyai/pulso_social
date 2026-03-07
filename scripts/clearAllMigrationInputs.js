#!/usr/bin/env node

import { ConvexHttpClient } from 'convex/browser';

// Configuración
const DEPLOYMENT_URL = 'https://energetic-cuttlefish-560.convex.cloud';

async function clearInputsBatch(client) {
  try {
    const result = await client.mutation('pulso/agents:clearPendingMigrationInputsBatch', {
      batchSize: 50,
    });
    
    return result;
  } catch (error) {
    console.error(`Error limpiando lote:`, error.message);
    return { deleted: 0, done: true };
  }
}

async function main() {
  console.log('Iniciando limpieza de TODOS los inputs de migración...');
  console.log('');

  const client = new ConvexHttpClient(DEPLOYMENT_URL);
  
  let totalDeleted = 0;
  let iterations = 0;
  
  while (true) {
    const result = await clearInputsBatch(client);
    
    totalDeleted += result.deleted;
    iterations++;
    
    if (iterations % 10 === 0) {
      console.log(`Iteración ${iterations}: ${result.deleted} inputs eliminados (Total: ${totalDeleted})`);
    }
    
    if (result.done) {
      break;
    }
  }
  
  console.log('');
  console.log('✓ Limpieza completada!');
  console.log(`Total de inputs eliminados: ${totalDeleted}`);
  console.log(`Iteraciones: ${iterations}`);
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});