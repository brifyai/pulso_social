#!/usr/bin/env node

/**
 * Script para cargar agentes en lotes usando npx convex run
 * 
 * Uso:
 *   node scripts/loadAgentsBatch.js [offset] [limit]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const INPUT_FILE = path.join(__dirname, '../agents_10k_transformed.json');
const BATCH_SIZE = 10; // Lotes pequeños para evitar límites

// Mapeo de GSE basado en cine11 (nivel educativo)
function getGSE(cine11) {
  if (!cine11) return 'C3';
  const cine = parseInt(cine11);
  if (cine >= 6) return 'ABC1';
  if (cine >= 4) return 'C2';
  if (cine >= 2) return 'C3';
  return 'D';
}

// Generar intereses basados en edad y educación
function getInterests(age, escolaridad) {
  const interests = [];
  
  if (age < 30) {
    interests.push('musica', 'deportes', 'tecnologia');
  } else if (age < 50) {
    interests.push('trabajo', 'familia', 'actualidad');
  } else {
    interests.push('salud', 'familia', 'pasatiempos');
  }
  
  if (escolaridad && escolaridad.includes('superior')) {
    interests.push('lectura', 'cultura');
  }
  
  return [...new Set(interests)].slice(0, 5);
}

// Transformar un agente al formato esperado
function transformAgent(agent, worldId, index) {
  const gridSize = Math.ceil(Math.sqrt(index + 1));
  const x = (index % gridSize) * 5;
  const y = Math.floor(index / gridSize) * 5;
  
  return {
    playerId: `agent_${agent.playerId || index}`,
    name: agent.name || `Agente_${index + 1}`,
    age: parseInt(agent.age) || 30,
    gse: getGSE(agent.cine11),
    region: agent.region || 'Metropolitana',
    comuna: agent.comuna || 'Santiago',
    politicalLeaning: 5,
    interests: getInterests(parseInt(agent.age), agent.escolaridad),
    worldId,
    isVisible: true,
    x,
    y,
  };
}

async function main() {
  console.log('📥 Carga de Agentes por Lotes - Pulso Social');
  console.log('============================================');
  
  // Verificar archivo
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`✗ Error: No se encontró: ${INPUT_FILE}`);
    process.exit(1);
  }
  
  console.log('📂 Leyendo agentes...');
  const agents = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`✓ ${agents.length} agentes listos`);
  console.log('');
  
  // Obtener offset y limit de argumentos
  const offset = parseInt(process.argv[2]) || 0;
  const limit = parseInt(process.argv[3]) || BATCH_SIZE;
  
  console.log(`📊 Offset: ${offset}, Límite: ${limit}`);
  console.log('');
  
  // Obtener worldId
  console.log('🌍 Obteniendo worldId...');
  try {
    const worldIdOutput = execSync(
      'npx convex run pulso/agents:getDefaultWorldId',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const worldId = worldIdOutput.trim().replace(/^'|'$/g, '');
    console.log(`✓ World ID: ${worldId}`);
    console.log('');
    
    // Transformar y filtrar agentes
    const batch = agents.slice(offset, offset + limit);
    const transformed = batch.map((agent, i) => transformAgent(agent, worldId, offset + i));
    
    console.log(`🔄 ${transformed.length} agentes transformados`);
    console.log('');
    
    // Guardar lote en archivo temporal
    const tempFile = path.join(__dirname, `temp_batch_${offset}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(transformed, null, 2));
    
    console.log(`📄 Archivo temporal: ${tempFile}`);
    console.log('');
    console.log('Ejecuta el siguiente comando para cargar este lote:');
    console.log('');
    console.log(`npx convex run pulso/agents:bulkInsertAgentsFromFile --args '{"worldId":"${worldId}"}' < ${tempFile}`);
    console.log('');
    console.log('O usa la función interna directamente:');
    console.log(`npx convex run pulso/agents:bulkInsertPanelAgentsInternal '{"agents":<contenido del archivo>}'`);
    
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    if (error.stderr) {
      console.error(`stderr: ${error.stderr.toString()}`);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});