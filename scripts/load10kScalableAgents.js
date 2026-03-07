#!/usr/bin/env node

/**
 * Script para cargar 10,000 agentes en la arquitectura escalable
 * Los agentes se cargan en la tabla 'agents' (no en el documento worlds)
 */

import { ConvexHttpClient } from 'convex/browser';
import fs from 'fs';

// Configuración
const DEPLOYMENT_URL = process.env.CONVEX_DEPLOYMENT_URL || 'https://energetic-cuttlefish-560.convex.cloud';
const JSON_FILE = './agents_10k_transformed.json';
const BATCH_SIZE = 100; // Agentes por lote

console.log(`Usando deployment: ${DEPLOYMENT_URL}`);

async function main() {
  console.log('=== Carga de 10,000 Agentes en Arquitectura Escalable ===\n');
  
  // Leer el archivo JSON
  console.log(`Leyendo ${JSON_FILE}...`);
  const allAgents = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  console.log(`Total de agentes en JSON: ${allAgents.length}`);
  
  const client = new ConvexHttpClient(DEPLOYMENT_URL);
  
  // Verificar zonas existentes
  console.log('\nVerificando zonas...');
  const zonesStatus = await client.query('aiTown/scalableMigration:getZonesStatus');
  console.log(`Zonas disponibles: ${zonesStatus.zonesCount}`);
  
  if (zonesStatus.zonesCount === 0) {
    console.log('Creando zonas...');
    await client.mutation('aiTown/scalableMigration:createZones', { gridSize: 4 });
    console.log('✓ Zonas creadas');
  }
  
  // Verificar agentes existentes en tabla escalable
  console.log('\nVerificando agentes existentes...');
  const scalableStatus = await client.query('aiTown/scalableMigration:countScalableAgents');
  console.log(`Agentes en tabla escalable: ${scalableStatus.count}`);
  
  // Calcular cuántos agentes faltan
  const remaining = allAgents.length - scalableStatus.count;
  console.log(`Agentes restantes por cargar: ${remaining}`);
  
  if (remaining <= 0) {
    console.log('\n✓ Todos los agentes ya están cargados!');
    return;
  }
  
  // Obtener los agentes que faltan cargar
  // Usamos playerId para identificar cuáles ya están cargados
  const agentsToLoad = allAgents.slice(scalableStatus.count);
  console.log(`Agentes a cargar: ${agentsToLoad.length}`);
  
  // Cargar en lotes
  let loaded = 0;
  let batchCount = 0;
  
  while (loaded < agentsToLoad.length) {
    const batch = agentsToLoad.slice(loaded, loaded + BATCH_SIZE);
    const batchNum = ++batchCount;
    
    console.log(`\nCargando lote ${batchNum} (${batch.length} agentes)...`);
    
    try {
      const result = await client.mutation('aiTown/scalableMigration:load10kAgents', {
        agents: batch,
      });
      
      loaded += result.loaded;
      console.log(`✓ Cargados ${result.loaded} agentes (Total: ${loaded}/${agentsToLoad.length})`);
      console.log(`   Saltados: ${result.skipped}`);
      console.log(`   Restantes: ${result.remaining}`);
      
      // Pequeña pausa entre lotes
      if (loaded < agentsToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`✗ Error en lote ${batchNum}:`, error.message);
      break;
    }
  }
  
  console.log('\n=== Carga Completada ===');
  console.log(`Total cargados en esta ejecución: ${loaded}`);
  
  // Verificar el resultado final
  const finalStatus = await client.query('aiTown/scalableMigration:countScalableAgents');
  console.log(`Agentes totales en tabla escalable: ${finalStatus.count}`);
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});