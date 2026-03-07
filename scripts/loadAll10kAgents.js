#!/usr/bin/env node

/**
 * Script para cargar todos los 10,000 agentes en lotes de 50
 * 
 * Uso:
 *   node scripts/loadAll10kAgents.js [offset] [batchSize]
 * 
 * Ejemplos:
 *   node scripts/loadAll10kAgents.js           # Carga todos desde el inicio
 *   node scripts/loadAll10kAgents.js 5000 50   # Carga desde el agente 5000
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const INPUT_FILE = path.join(__dirname, '../agents_10k_transformed.json');
const TOTAL_AGENTS = 10000;
const DEFAULT_BATCH_SIZE = 50;

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
  console.log('📥 Carga Masiva de 10,000 Agentes - Pulso Social');
  console.log('=================================================');
  
  // Leer argumentos
  const startOffset = parseInt(process.argv[2]) || 0;
  const batchSize = parseInt(process.argv[3]) || DEFAULT_BATCH_SIZE;
  
  // Verificar archivo
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`✗ Error: No se encontró: ${INPUT_FILE}`);
    process.exit(1);
  }
  
  console.log(`📂 Archivo: ${INPUT_FILE}`);
  console.log(`📊 Offset inicial: ${startOffset}, Tamaño de lote: ${batchSize}`);
  console.log('');
  
  // Leer agentes
  console.log('📂 Leyendo agentes...');
  const allAgents = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`✓ ${allAgents.length} agentes disponibles`);
  console.log('');
  
  // Obtener worldId
  console.log('🌍 Obteniendo worldId...');
  let worldId;
  try {
    worldId = execSync(
      'npx convex run pulso/agents:getDefaultWorldId',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim().replace(/^'|'$/g, '');
    console.log(`✓ World ID: ${worldId}`);
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    process.exit(1);
  }
  console.log('');
  
  // Limpiar worldId
  const cleanWorldId = worldId.replace(/^"|"$/g, '');
  
  // Calcular lotes
  const totalBatches = Math.ceil((allAgents.length - startOffset) / batchSize);
  console.log(`📦 Total de lotes: ${totalBatches}`);
  console.log('');
  
  // Contadores
  let totalLoaded = 0;
  let totalErrors = 0;
  let currentOffset = startOffset;
  
  // Procesar lotes
  for (let batchNum = 0; currentOffset < allAgents.length; batchNum++) {
    const batch = allAgents.slice(currentOffset, currentOffset + batchSize);
    const actualBatchSize = batch.length;
    
    if (batch.length === 0) break;
    
    const displayBatchNum = batchNum + 1;
    const progress = ((currentOffset / allAgents.length) * 100).toFixed(1);
    
    console.log(`📤 Lote ${displayBatchNum}/${totalBatches} (agentes ${currentOffset + 1}-${currentOffset + actualBatchSize}) - ${progress}% completado`);
    
    try {
      // Transformar agentes
      const transformed = batch.map((agent, i) => transformAgent(agent, cleanWorldId, currentOffset + i));
      
      // Crear argumentos
      const argsContent = JSON.stringify({
        agents: transformed,
        worldId: cleanWorldId,
      });
      
      // Escapar el JSON para la línea de comandos
      const escapedArgs = argsContent.replace(/'/g, "'\\''");
      
      // Ejecutar carga
      execSync(
        `npx convex run pulso/agents:bulkInsertAgentsFromFile '${escapedArgs}'`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      totalLoaded += actualBatchSize;
      console.log(`   ✓ ${actualBatchSize} agentes cargados`);
      
    } catch (error) {
      totalErrors++;
      console.error(`   ✗ Error: ${error.message}`);
    }
    
    // Actualizar offset
    currentOffset += batchSize;
    
    // Mostrar progreso cada 5 lotes
    if (displayBatchNum % 5 === 0) {
      console.log(`📊 Progreso: ${totalLoaded} agentes cargados, ${totalErrors} errores`);
      console.log('');
    }
    
    // Pequeña pausa entre lotes para evitar rate limiting
    if (currentOffset < allAgents.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log('');
  console.log('=================================================');
  console.log('✅ Carga completada!');
  console.log(`📈 Total cargados: ${totalLoaded}/${allAgents.length}`);
  console.log(`⚠️  Errores: ${totalErrors} lotes fallidos`);
  console.log('');
  
  // Verificar resultado final
  console.log('🔍 Verificando resultado...');
  try {
    const countOutput = execSync(
      `npx convex run pulso/agents:countTable '{"tableName":"panelAgents"}'`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    const match = countOutput.match(/count:\s*(\d+)/);
    if (match) {
      console.log(`✓ Agentes en la base de datos: ${match[1]}`);
    }
  } catch (error) {
    console.error(`✗ Error verificando: ${error.message}`);
  }
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});