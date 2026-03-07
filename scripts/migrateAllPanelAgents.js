#!/usr/bin/env node

/**
 * Script para migrar todos los agentes desde panelAgents al mundo de aiTown
 * Ejecuta múltiples lotes hasta completar todos los agentes
 * Elimina los agentes migrados de panelAgents después de cada lote
 * 
 * Uso:
 *   node scripts/migrateAllPanelAgents.js [batchSize]
 * 
 * Ejemplos:
 *   node scripts/migrateAllPanelAgents.js 100   # Migra en lotes de 100
 */

import { execSync } from 'child_process';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error) {
    throw new Error(`Comando fallido: ${cmd}\n${error.message}\n${error.stderr || ''}`);
  }
}

async function main() {
  console.log('🔄 Migración Completa - panelAgents → aiTown');
  console.log('==============================================');
  
  // Leer argumentos
  const batchSize = parseInt(process.argv[2]) || 100;
  
  console.log(`📊 Tamaño de lote: ${batchSize}`);
  console.log('');
  
  let totalMigrated = 0;
  let batchNum = 0;
  let lastCursor = null;
  
  while (true) {
    batchNum++;
    console.log(`📤 Lote ${batchNum}...`);
    
    try {
      // Ejecutar migración de un lote
      const result = runCommand(
        `npx convex run pulso/agents:migrateAgentsToAiTownInternal '{"limit":${batchSize},"batchSize":${batchSize}}'`
      );
      
      // Parsear resultado
      const migratedMatch = result.match(/migrated:\s*(\d+)/);
      const cursorMatch = result.match(/cursor:\s*['"]?([^,'"\s}]+)/);
      
      const migrated = migratedMatch ? parseInt(migratedMatch[1]) : 0;
      const cursor = cursorMatch ? cursorMatch[1] : null;
      
      if (migrated === 0) {
        console.log('✓ No hay más agentes para migrar');
        break;
      }
      
      totalMigrated += migrated;
      console.log(`   ✓ ${migrated} agentes migrados (Total: ${totalMigrated})`);
      console.log(`   📍 Cursor: ${cursor || 'N/A'}`);
      
      // Eliminar los agentes migrados de panelAgents
      if (cursor) {
        console.log(`   🗑️ Eliminando agentes migrados de panelAgents...`);
        try {
          const deleteResult = runCommand(
            `npx convex run pulso/agents:deletePanelAgentsUpToPlayerId '{"maxPlayerId":"${cursor}","batchSize":${batchSize}}'`
          );
          const deletedMatch = deleteResult.match(/deleted:\s*(\d+)/);
          const deleted = deletedMatch ? parseInt(deletedMatch[1]) : 0;
          console.log(`   ✓ ${deleted} agentes eliminados de panelAgents`);
        } catch (err) {
          console.log(`   ⚠️ No se pudieron eliminar los agentes: ${err.message}`);
        }
      }
      
      lastCursor = cursor;
      
      // Pequeña pausa entre lotes
      await sleep(500);
      
    } catch (error) {
      console.error(`✗ Error en lote ${batchNum}:`, error.message);
      break;
    }
  }
  
  console.log('');
  console.log('==============================================');
  console.log('✅ Migración completada!');
  console.log(`📈 Total migrados: ${totalMigrated}`);
  console.log('');
  
  // Verificar resultado
  console.log('🔍 Verificando resultado...');
  try {
    const countOutput = runCommand(
      `npx convex run pulso/agents:countAiTownAgents`
    );
    console.log('📊 aiTown:');
    console.log(countOutput);
  } catch (error) {
    console.error(`✗ Error verificando aiTown: ${error.message}`);
  }
  
  // Verificar panelAgents restantes
  try {
    const panelCount = runCommand(
      `npx convex run pulso/agents:countTable '{"tableName":"panelAgents"}'`
    );
    console.log('📊 panelAgents restantes:');
    console.log(panelCount);
  } catch (error) {
    console.error(`✗ Error verificando panelAgents: ${error.message}`);
  }
}

main().catch(console.error);