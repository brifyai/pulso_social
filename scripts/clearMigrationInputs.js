#!/usr/bin/env node

import { ConvexHttpClient } from 'convex/browser';

// Configuración
const DEPLOYMENT_URL = 'https://energetic-cuttlefish-560.convex.cloud';

// Función para limpiar inputs de migración en lotes pequeños
async function clearMigrationInputsBatch(client, batchSize = 20) {
  try {
    const result = await client.mutation('pulso/agents:clearPendingMigrationInputsBatch', {
      batchSize,
    });
    return result;
  } catch (error) {
    console.error('Error limpiando lote:', error.message);
    return { deleted: 0, done: true };
  }
}

async function main() {
  console.log('Iniciando limpieza de inputs de migración...');
  console.log('');

  const client = new ConvexHttpClient(DEPLOYMENT_URL);
  
  let totalDeleted = 0;
  let iterations = 0;
  const maxIterations = 100; // Límite de iteraciones para evitar bucles infinitos
  
  while (iterations < maxIterations) {
    const result = await clearMigrationInputsBatch(client, 20);
    
    if (result.deleted === 0) {
      console.log('No hay más inputs de migración para eliminar');
      break;
    }
    
    totalDeleted += result.deleted;
    iterations++;
    
    console.log(`Iteración ${iterations}: ${result.deleted} inputs eliminados (Total: ${totalDeleted})`);
    
    // Pequeña pausa entre iteraciones
    await new Promise(resolve => setTimeout(resolve, 500));
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