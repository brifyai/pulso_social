#!/usr/bin/env node

/**
 * Script directo para cargar 10,000 agentes usando Convex HTTP API
 * 
 * Uso:
 *   node scripts/directLoadAgents.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const INPUT_FILE = path.join(__dirname, '../agents_10k_transformed.json');
const BASE_URL = 'https://hardy-ocelot-644.convex.cloud';
const BATCH_SIZE = 100;

async function getWorldId() {
  const response = await fetch(`${BASE_URL}/api/getDefaultWorldId`, {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  const result = await response.json();
  return result.worldId;
}

async function loadBatch(agents, worldId) {
  const response = await fetch(`${BASE_URL}/api/bulkInsertAgents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agents, worldId }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  return response.json();
}

async function main() {
  console.log('📥 Carga Directa de Agentes - Pulso Social');
  console.log('=========================================');
  console.log(`URL: ${BASE_URL}`);
  console.log('');
  
  // Verificar archivo
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`✗ Error: No se encontró: ${INPUT_FILE}`);
    process.exit(1);
  }
  
  console.log('📂 Leyendo agentes...');
  let agents;
  try {
    agents = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
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
  let errors = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batchNum = i + 1;
    const batch = batches[i];
    
    try {
      console.log(`📤 Lote ${batchNum}/${batches.length}...`);
      const result = await loadBatch(batch, worldId);
      totalLoaded += result.inserted;
      console.log(`✓ ${result.inserted} agentes cargados`);
    } catch (error) {
      errors++;
      console.error(`✗ Error lote ${batchNum}: ${error.message}`);
    }
    
    // Progreso cada 10 lotes
    if (batchNum % 10 === 0) {
      const pct = ((batchNum / batches.length) * 100).toFixed(1);
      console.log(`📊 Progreso: ${pct}% (${totalLoaded}/${agents.length})`);
    }
    
    // Pausa entre lotes
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  console.log('');
  console.log('=========================================');
  console.log('✅ Carga completada!');
  console.log(`📈 Total: ${totalLoaded}/${agents.length} agentes`);
  console.log(`⚠️  Errores: ${errors} lotes fallidos`);
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});