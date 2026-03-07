#!/usr/bin/env node

/**
 * Script simple para cargar agentes usando Convex HttpClient
 * 
 * Uso:
 *   node scripts/simpleLoadAgents.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const INPUT_FILE = path.join(__dirname, '../agents_10k_transformed.json');
const CONVEX_URL = 'https://hardy-ocelot-644.convex.cloud';
const BATCH_SIZE = 50;

async function main() {
  console.log('📥 Carga Simple de Agentes - Pulso Social');
  console.log('=========================================');
  console.log(`URL: ${CONVEX_URL}`);
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
  
  // Crear cliente HTTP
  const client = new ConvexHttpClient(CONVEX_URL);
  
  // Obtener worldId
  console.log('🌍 Obteniendo worldId...');
  let worldId;
  try {
    worldId = await client.query(api.pulso.agents.getDefaultWorldIdInternal);
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
      
      const result = await client.mutation(api.pulso.agents.bulkInsertAgentsFromFile, {
        agents: batch.map(agent => ({
          ...agent,
          worldId,
        })),
        worldId,
      });
      
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
      await new Promise(r => setTimeout(r, 500));
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