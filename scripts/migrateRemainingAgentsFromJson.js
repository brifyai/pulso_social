#!/usr/bin/env node

/**
 * Script para migrar agentes restantes directamente desde el archivo JSON
 * a aiTown, sin usar el motor del juego.
 */

import { ConvexHttpClient } from 'convex/browser';
import fs from 'fs';

// Configuración
const DEPLOYMENT_URL = process.env.CONVEX_DEPLOYMENT_URL || 'https://energetic-cuttlefish-560.convex.cloud';
const JSON_FILE = './agents_10k_transformed.json';
const BATCH_SIZE = 10; // Reducido a 10 para evitar límites de tiempo y bytes

console.log(`Usando deployment: ${DEPLOYMENT_URL}`);

async function main() {
  console.log('=== Migración Directa de Agentes Restantes ===\n');
  
  // Leer el archivo JSON
  console.log(`Leyendo ${JSON_FILE}...`);
  const allAgents = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  console.log(`Total de agentes en JSON: ${allAgents.length}`);
  
  const client = new ConvexHttpClient(DEPLOYMENT_URL);
  
  // Obtener el estado actual de aiTown
  console.log('\nObteniendo estado actual de aiTown...');
  const currentStatus = await client.query('pulso/agents:countAiTownAgents');
  console.log(`Agentes actuales en aiTown: ${currentStatus.agentsCount}`);
  
  // Obtener el nextId del mundo
  const worldStatus = await client.query('pulso/agents:getWorldNextId');
  console.log(`NextId actual del mundo: ${worldStatus.nextId}`);
  
  // Calcular cuántos agentes faltan
  const remaining = allAgents.length - currentStatus.agentsCount;
  console.log(`Agentes restantes por migrar: ${remaining}`);
  
  if (remaining <= 0) {
    console.log('\n✓ Todos los agentes ya están migrados!');
    return;
  }
  
  // Obtener los agentes que faltan migrar (los últimos 'remaining' agentes)
  const agentsToMigrate = allAgents.slice(currentStatus.agentsCount);
  console.log(`Agentes a migrar: ${agentsToMigrate.length}`);
  
  // Migrar en lotes
  let migrated = 0;
  let batchCount = 0;
  let currentStartIndex = worldStatus.nextId;
  
  // Campos válidos según el validador
  const validFields = ['playerId', 'name', 'age', 'gse', 'region', 'comuna', 'politicalLeaning', 'interests', 'x', 'y', 'sex', 'p23_est_civil', 'escolaridad', 'sit_fuerza_trabajo'];
  
  while (migrated < agentsToMigrate.length) {
    const batch = agentsToMigrate.slice(migrated, migrated + BATCH_SIZE);
    const batchNum = ++batchCount;
    
    // Filtrar solo los campos válidos
    const filteredBatch = batch.map(agent => {
      const filtered = {};
      for (const field of validFields) {
        if (agent.hasOwnProperty(field)) {
          filtered[field] = agent[field];
        }
      }
      return filtered;
    });
    
    console.log(`\nMigrando lote ${batchNum} (${filteredBatch.length} agentes), startIndex: ${currentStartIndex}...`);
    
    try {
      // Usar la función pública de inserción directa
      const result = await client.mutation('pulso/agents:insertAgentsDirectlyToAiTown', {
        agents: filteredBatch,
        startIndex: currentStartIndex,
      });
      
      migrated += result.inserted;
      currentStartIndex = result.nextId;
      console.log(`✓ Insertados ${result.inserted} agentes (Total: ${migrated}/${agentsToMigrate.length})`);
      console.log(`   NextId actualizado a: ${currentStartIndex}`);
      console.log(`   Restantes: ${result.remaining}`);
      
      // Pequeña pausa entre lotes
      if (migrated < agentsToMigrate.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`✗ Error en lote ${batchNum}:`, error.message);
      break;
    }
  }
  
  console.log('\n=== Migración Completada ===');
  console.log(`Total migrados en esta ejecución: ${migrated}`);
  
  // Verificar el resultado final
  const finalStatus = await client.query('pulso/agents:countAiTownAgents');
  console.log(`Agentes totales en aiTown: ${finalStatus.agentsCount}`);
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});