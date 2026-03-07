#!/usr/bin/env node

/**
 * Script para cargar agentes en lotes pequeños (10 agentes por lote)
 * 
 * Uso:
 *   node scripts/load10kBatch.js [offset] [count]
 * 
 * Ejemplos:
 *   node scripts/load10kBatch.js 0 10    # Carga agentes 1-10
 *   node scripts/load10kBatch.js 10 10   # Carga agentes 11-20
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const INPUT_FILE = path.join(__dirname, '../agents_10k_transformed.json');
const OUTPUT_FILE = path.join(__dirname, 'temp_batch.json');

// Mapeo de GSE basado en cine11
function getGSE(cine11) {
  if (!cine11) return 'C3';
  const cine = parseInt(cine11);
  if (cine >= 6) return 'ABC1';
  if (cine >= 4) return 'C2';
  if (cine >= 2) return 'C3';
  return 'D';
}

// Generar intereses
function getInterests(age, escolaridad) {
  const interests = [];
  if (age < 30) interests.push('musica', 'deportes', 'tecnologia');
  else if (age < 50) interests.push('trabajo', 'familia', 'actualidad');
  else interests.push('salud', 'familia', 'pasatiempos');
  if (escolaridad && escolaridad.includes('superior')) interests.push('lectura', 'cultura');
  return [...new Set(interests)].slice(0, 5);
}

// Transformar agente
function transformAgent(agent, worldId, index) {
  const gridSize = Math.ceil(Math.sqrt(index + 1));
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
    x: (index % gridSize) * 5,
    y: Math.floor(index / gridSize) * 5,
  };
}

async function main() {
  console.log('📥 Carga de Agentes - Lote Pequeño');
  console.log('==================================');
  
  // Leer argumentos
  const offset = parseInt(process.argv[2]) || 0;
  const count = parseInt(process.argv[3]) || 10;
  
  // Verificar archivo
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`✗ Error: No se encontró: ${INPUT_FILE}`);
    process.exit(1);
  }
  
  console.log(`📂 Offset: ${offset}, Count: ${count}`);
  
  // Leer agentes
  const agents = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  const batch = agents.slice(offset, offset + count);
  
  if (batch.length === 0) {
    console.error('✗ No hay agentes en este rango');
    process.exit(1);
  }
  
  console.log(`📊 ${batch.length} agentes en el lote`);
  
  // Obtener worldId
  console.log('🌍 Obteniendo worldId...');
  try {
    const worldId = execSync(
      'npx convex run pulso/agents:getDefaultWorldId',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim().replace(/^'|'$/g, '');
    
    console.log(`✓ World ID: ${worldId}`);
    
    // Transformar agentes
    const transformed = batch.map((agent, i) => transformAgent(agent, worldId, offset + i));
    
    // Guardar lote
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(transformed, null, 2));
    console.log(`📄 Lote guardado en: ${OUTPUT_FILE}`);
    
    // Ejecutar carga - pasar JSON directamente en la línea de comandos
    console.log('📤 Cargando agentes...');
    
    // Limpiar el worldId de comillas
    const cleanWorldId = worldId.replace(/^"|"$/g, '');
    
    // Transformar agentes con el worldId limpio (sin comillas)
    const agentsWithCleanWorldId = transformed.map(agent => ({
      ...agent,
      worldId: cleanWorldId,
    }));
    
    const argsContent = JSON.stringify({
      agents: agentsWithCleanWorldId,
      worldId: cleanWorldId,
    });
    
    // Escapar el JSON para la línea de comandos
    const escapedArgs = argsContent.replace(/'/g, "'\\''");
    
    const result = execSync(
      `npx convex run pulso/agents:bulkInsertAgentsFromFile '${escapedArgs}'`,
      { encoding: 'utf-8', stdio: 'inherit' }
    );
    
    console.log('✅ Carga completada!');
    
    // Limpiar archivo temporal
    fs.unlinkSync(OUTPUT_FILE);
    
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    if (error.stderr) console.error(error.stderr.toString());
    process.exit(1);
  }
}

main().catch(console.error);