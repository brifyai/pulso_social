#!/usr/bin/env node

/**
 * Script para migrar agentes desde panelAgents al mundo de aiTown
 * 
 * Uso:
 *   node scripts/migratePanelAgentsToAiTown.js [limit] [batchSize]
 * 
 * Ejemplos:
 *   node scripts/migratePanelAgentsToAiTown.js 100 10   # Migra 100 agentes en lotes de 10
 */

import { execSync } from 'child_process';

async function main() {
  console.log('🔄 Migración de Agentes - panelAgents → aiTown');
  console.log('================================================');
  
  // Leer argumentos
  const limit = parseInt(process.argv[2]) || 100;
  const batchSize = parseInt(process.argv[3]) || 10;
  
  console.log(`📊 Límite: ${limit}, Tamaño de lote: ${batchSize}`);
  console.log('');
  
  try {
    // Ejecutar migración
    console.log('🚀 Iniciando migración...');
    const result = execSync(
      `npx convex run pulso/agents:migrateAgentsDirectlyInternal '{"limit":${limit},"batchSize":${batchSize}}'`,
      { encoding: 'utf-8', stdio: 'inherit' }
    );
    
    console.log('');
    console.log('✅ Migración completada!');
    
    // Verificar resultado
    console.log('');
    console.log('🔍 Verificando resultado...');
    const countOutput = execSync(
      `npx convex run pulso/agents:countAiTownAgents`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    console.log(countOutput);
    
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    if (error.stderr) console.error(error.stderr.toString());
    process.exit(1);
  }
}

main().catch(console.error);