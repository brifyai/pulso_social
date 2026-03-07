#!/usr/bin/env node

/**
 * Script para limpiar todos los agentes de las tablas panelAgents y agentsFull
 * 
 * Uso:
 *   node scripts/clearAllAgents.js
 * 
 * Requiere:
 *   - Variables de entorno configuradas en .env.local
 *   - Convex CLI instalado
 */

import { execSync } from 'child_process';

// Configuración
const DEPLOYMENT = process.env.CONVEX_DEPLOYMENT || 'dev:energetic-cuttlefish-560';

function runConvexCommand(functionName, args = {}) {
  try {
    // Los argumentos se pasan como JSON después del nombre de la función
    const argsJson = JSON.stringify(args);
    const output = execSync(`CONVEX_DEPLOYMENT=${DEPLOYMENT} npx convex run "${functionName}" '${argsJson}'`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return output;
  } catch (error) {
    throw new Error(`Error ejecutando comando: ${error.message}\n${error.stdout || ''}`);
  }
}

function clearTableWithPagination(functionName, tableName) {
  let totalDeleted = 0;
  let done = false;
  let iteration = 0;
  
  while (!done) {
    iteration++;
    const output = runConvexCommand(functionName, { batchSize: 100 });
    
    // Parsear el resultado
    const match = output.match(/✓ (\d+) agentes eliminados en este lote/);
    const deleted = match ? parseInt(match[1]) : 0;
    totalDeleted += deleted;
    
    // Verificar si terminó
    done = output.includes('"done": true') || output.includes('No hay más agentes') || deleted === 0;
    
    if (!done) {
      console.log(`   → ${tableName}: ${totalDeleted} registros eliminados... (iteración ${iteration})`);
    }
  }
  
  return totalDeleted;
}

async function main() {
  console.log('🧹 Limpieza de Agentes - Pulso Social');
  console.log('=====================================');
  console.log(`Deployment: ${DEPLOYMENT}`);
  console.log('');
  
  try {
    // Usar funciones internas con npx convex run y paginación
    console.log('🗑️  Limpiando tabla panelAgents...');
    const panelDeleted = clearTableWithPagination('pulso/agents:clearPanelAgentsInternal', 'panelAgents');
    console.log(`✓ panelAgents: ${panelDeleted} registros eliminados`);
    
    console.log('');
    console.log('🗑️  Limpiando tabla agentsFull...');
    const fullDeleted = clearTableWithPagination('pulso/agents:clearAgentsFullInternal', 'agentsFull');
    console.log(`✓ agentsFull: ${fullDeleted} registros eliminados`);
    
    // Resumen
    console.log('');
    console.log('=====================================');
    console.log('✅ Limpieza completada');
    console.log(`   Total eliminado: ${panelDeleted + fullDeleted} registros`);
    console.log('');
    console.log('Siguiente paso:');
    console.log('   node scripts/load10kAgents.js');
    console.log('');
    
  } catch (error) {
    console.error('✗ Error fatal:', error.message);
    console.log('');
    console.log('Intenta ejecutar manualmente:');
    console.log('  CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:clearPanelAgentsInternal --batchSize 100');
    console.log('  CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:clearAgentsFullInternal --batchSize 100');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error no capturado:', error);
  process.exit(1);
});
