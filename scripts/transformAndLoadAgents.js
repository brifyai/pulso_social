#!/usr/bin/env node

/**
 * Script para transformar y cargar agentes usando Convex HttpClient
 * 
 * Uso:
 *   node scripts/transformAndLoadAgents.js
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

// Mapeo de GSE basado en cine11 (nivel educativo)
function getGSE(cine11) {
  if (!cine11) return 'C3';
  const cine = parseInt(cine11);
  if (cine >= 6) return 'ABC1';
  if (cine >= 4) return 'C2';
  if (cine >= 2) return 'C3';
  return 'D';
}

// Mapeo de estado civil
function getEstadoCivil(p23_est_civil) {
  const map = {
    '1': 'Soltero',
    '2': 'Casado',
    '3': 'Conviviente',
    '4': 'Separado',
    '5': 'Divorciado',
    '6': 'Viudo',
    '7': 'Soltero',
    '8': 'Soltero',
  };
  return map[p23_est_civil] || 'Soltero';
}

// Mapeo de sexo
function getSexo(sex) {
  return sex === '1' ? 'Masculino' : sex === '2' ? 'Femenino' : 'Otro';
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
  // Calcular posición en grid (espiral o grid)
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
    politicalLeaning: 5, // Neutral por defecto
    interests: getInterests(parseInt(agent.age), agent.escolaridad),
    worldId,
    isVisible: true,
    x,
    y,
    // Datos adicionales para referencia
    metadata: {
      sex: getSexo(agent.sex),
      estadoCivil: getEstadoCivil(agent.p23_est_civil),
      escolaridad: agent.escolaridad,
      sit_fuerza_trabajo: agent.sit_fuerza_trabajo,
      id_global: agent.id_global,
      id_vivienda: agent.id_vivienda,
      id_hogar: agent.id_hogar,
      id_persona: agent.id_persona,
    },
  };
}

async function main() {
  console.log('🔄 Transformación y Carga de Agentes - Pulso Social');
  console.log('====================================================');
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
  
  // Crear cliente HTTP con identidad de admin
  const client = new ConvexHttpClient(CONVEX_URL, {
    headers: {
      'X-Admin-Email': 'admin@pulso.social',
    },
  });
  
  // Obtener worldId usando la función interna (sin auth)
  console.log('🌍 Obteniendo worldId...');
  let worldId;
  try {
    // Usar fetch directo ya que HttpClient no soporta bien las funciones internas
    const response = await fetch(`${CONVEX_URL}/api/getDefaultWorldId`, {
      method: 'GET',
      headers: {
        'X-Admin-Email': 'admin@pulso.social',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    worldId = result.worldId;
    console.log(`✓ World ID: ${worldId}`);
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    process.exit(1);
  }
  console.log('');
  
  // Transformar agentes
  console.log('🔄 Transformando agentes...');
  const transformedAgents = agents.map((agent, index) => transformAgent(agent, worldId, index));
  console.log(`✓ ${transformedAgents.length} agentes transformados`);
  console.log('');
  
  // Dividir en lotes
  const batches = [];
  for (let i = 0; i < transformedAgents.length; i += BATCH_SIZE) {
    batches.push(transformedAgents.slice(i, i + BATCH_SIZE));
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
        agents: batch,
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
      console.log(`📊 Progreso: ${pct}% (${totalLoaded}/${transformedAgents.length})`);
    }
    
    // Pausa entre lotes
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.log('');
  console.log('====================================================');
  console.log('✅ Carga completada!');
  console.log(`📈 Total: ${totalLoaded}/${transformedAgents.length} agentes`);
  console.log(`⚠️  Errores: ${errors} lotes fallidos`);
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});