#!/usr/bin/env node

/**
 * Script simplificado para cargar 10,000 agentes rápidamente
 * Usa convex run con archivo temporal para evitar límites de argumentos
 * 
 * Uso:
 *   node scripts/quickLoadAgents.js
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
const BATCH_SIZE = 50;
const TEMP_FILE = path.join(__dirname, '../temp_batch.json');

async function getWorldId() {
  const output = execSync(
    `CONVEX_DEPLOYMENT=${DEPLOYMENT} npx convex run pulso/agents:getDefaultWorldIdInternal`,
    { encoding: 'utf-8' }
  );
  return output.trim().replace(/'/g, '');
}

async function loadBatchWithFile(agents, worldId) {
  // Escribir batch en archivo temporal
  const batchData = {
    agents: agents.map(agent => ({
      ...agent,
      worldId,
    })),
    worldId,
  };
  
  fs.writeFileSync(TEMP_FILE, JSON.stringify(batchData));
  
  try {
    // Usar convex run leyendo desde archivo
    const output = execSync(
      `CONVEX_DEPLOYMENT=${DEPLOYMENT} npx convex run pulso/agents:bulkInsertAgentsFromFile --args-file ${TEMP_FILE}`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
    return JSON.parse(output);
  } catch (error) {
    throw new Error(error.message);
  } finally {
    // Limpiar archivo temporal
    if (fs.existsSync(TEMP_FILE)) {
      fs.unlinkSync(TEMP_FILE);
    }
  }
}

async function main() {
  console.log('📥 Carga Rápida de Agentes - Pulso Social');
  console.log('=========================================');
  console.log(`Deployment: ${DEPLOYMENT}`);
  console.log('');
  
  // Verificar archivo de entrada
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`✗ Error: No se encontró el archivo: ${INPUT_FILE}`);
    process.exit(1);
  }
  
  console.log('📂 Leyendo agentes...');
  let agents;
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    agents = JSON.parse(rawData);
  } catch (error) {
    console.error(`✗ Error leyendo archivo: ${error.message}`);
    process.exit(1);
  }
  
  console.log(`✓ ${agents.length} agentes listos`);
  console.log('');
  
  // Obtener worldId
  console.log('🌍 Obteniendo worldId...');
  let worldId;
  try {
    worldId = await getWorldId();
    console.log(`✓ World ID: ${worldId}`);
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    process.exit(1);
  }
  console.log('');
  
  // Dividir en lotes
  const batches = [];
  for (let i = 0; i < agents.length; i += BATCH_SIZE) {
    batches.push(agents.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`📦 ${batches.length} lotes (${BATCH_SIZE} agentes por lote)`);
  console.log('');
  
  // Cargar lotes
  let totalLoaded = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batchNum = i + 1;
    const batch = batches[i];
    
    try {
      console.log(`📤 Lote ${batchNum}/${batches.length}...`);
      const result = await loadBatchWithFile(batch, worldId);
      totalLoaded += result.inserted;
      console.log(`✓ ${result.inserted} agentes cargados`);
    } catch (error) {
      console.error(`✗ Error lote ${batchNum}: ${error.message}`);
    }
    
    // Progreso cada 10 lotes
    if (batchNum % 10 === 0) {
      const pct = ((batchNum / batches.length) * 100).toFixed(1);
      console.log(`📊 Progreso: ${pct}% (${totalLoaded}/${agents.length})`);
    }
    
    // Pequeña pausa
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.log('');
  console.log('=========================================');
  console.log('✅ Carga completada!');
  console.log(`📈 Total: ${totalLoaded}/${agents.length} agentes`);
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});