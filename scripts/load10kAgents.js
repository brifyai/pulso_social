#!/usr/bin/env node

/**
 * Script para cargar los 10,000 agentes transformados en Convex
 * 
 * Uso:
 *   node scripts/load10kAgents.js
 * 
 * Entrada:
 *   - agents_10k_transformed.json
 * 
 * Requiere:
 *   - Variables de entorno configuradas en .env.local
 *   - Convex CLI instalado
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const INPUT_FILE = path.join(__dirname, '../agents_10k_transformed.json');
const DEPLOYMENT = process.env.CONVEX_DEPLOYMENT || 'dev:energetic-cuttlefish-560';
const BATCH_SIZE = 100; // Agentes por lote
const PAUSE_BETWEEN_BATCHES = 2000; // 2 segundos entre lotes

async function getWorldId() {
  const output = execSync(
    `CONVEX_DEPLOYMENT=${DEPLOYMENT} npx convex run pulso/agents:getDefaultWorldId`,
    { encoding: 'utf-8' }
  );
  return output.trim().replace(/'/g, '');
}

async function loadBatch(agents, worldId, batchNum) {
  // Agregar worldId a cada agente
  const agentsWithWorldId = agents.map(agent => ({
    ...agent,
    worldId,
  }));
  
  try {
    // Usar convex run con la función interna bulkInsertPanelAgentsInternal
    // Los argumentos se pasan como JSON directamente
    const argsJson = JSON.stringify({ agents: agentsWithWorldId });
    const output = execSync(
      `CONVEX_DEPLOYMENT=${DEPLOYMENT} npx convex run pulso/agents:bulkInsertPanelAgentsInternal '${argsJson}'`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
    return JSON.parse(output);
  } catch (error) {
    throw new Error(error.message);
  }
}

async function main() {
  console.log('📥 Carga de 10,000 Agentes - Pulso Social');
  console.log('=========================================');
  console.log(`Deployment: ${DEPLOYMENT}`);
  console.log('');
  
  // Verificar archivo de entrada
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`✗ Error: No se encontró el archivo de entrada: ${INPUT_FILE}`);
    console.error('');
    console.error('Primero ejecuta: node scripts/transform10kAgents.js');
    process.exit(1);
  }
  
  console.log('📂 Leyendo agentes transformados...');
  let agents;
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    agents = JSON.parse(rawData);
  } catch (error) {
    console.error(`✗ Error leyendo el archivo: ${error.message}`);
    process.exit(1);
  }
  
  console.log(`✓ ${agents.length} agentes listos para cargar`);
  console.log('');
  
  // Obtener worldId
  console.log('🌍 Obteniendo worldId...');
  let worldId;
  try {
    worldId = await getWorldId();
    console.log(`✓ World ID: ${worldId}`);
  } catch (error) {
    console.error(`✗ Error obteniendo worldId: ${error.message}`);
    process.exit(1);
  }
  console.log('');
  
  // Dividir en lotes
  const batches = [];
  for (let i = 0; i < agents.length; i += BATCH_SIZE) {
    batches.push(agents.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`📦 ${batches.length} lotes preparados (${BATCH_SIZE} agentes por lote)`);
  console.log('');
  
  // Cargar lotes
  let totalLoaded = 0;
  let errors = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batchNum = i + 1;
    const batch = batches[i];
    
    try {
      console.log(`📤 Cargando lote ${batchNum}/${batches.length}...`);
      
      const result = await loadBatch(batch, worldId, batchNum);
      totalLoaded += result.inserted;
      
      console.log(`✓ Lote ${batchNum} completado: ${result.inserted} agentes`);
      
      // Pausa entre lotes (excepto en el último)
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, PAUSE_BETWEEN_BATCHES));
      }
    } catch (error) {
      errors++;
      console.error(`✗ Error en lote ${batchNum}: ${error.message}`);
      
      // Reintentar una vez
      try {
        console.log(`🔄 Reintentando lote ${batchNum}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        const result = await loadBatch(batch, worldId, batchNum);
        totalLoaded += result.inserted;
        console.log(`✓ Reintento exitoso: ${result.inserted} agentes`);
        errors--;
      } catch (retryError) {
        console.error(`✗ Reintento fallido para lote ${batchNum}: ${retryError.message}`);
      }
      
      // Pausa más larga después de error
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // Progreso cada 10 lotes
    if (batchNum % 10 === 0) {
      const percentage = ((batchNum / batches.length) * 100).toFixed(1);
      console.log(`📊 Progreso: ${percentage}% (${totalLoaded}/${agents.length} agentes)`);
    }
  }
  
  console.log('');
  console.log('=========================================');
  console.log('✅ Carga completada!');
  console.log('');
  console.log(`📈 Resumen:`);
  console.log(`   Total cargados: ${totalLoaded}`);
  console.log(`   Errores: ${errors}`);
  console.log(`   Porcentaje: ${((totalLoaded / agents.length) * 100).toFixed(2)}%`);
  console.log('');
  console.log('Siguientes pasos:');
  console.log('   CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:countAgents');
  console.log('   CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560 npx convex run pulso/agents:countAgentsByGSE');
  console.log('');
}

main().catch(error => {
  console.error('Error no capturado:', error);
  process.exit(1);
});