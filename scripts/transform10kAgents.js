#!/usr/bin/env node

/**
 * Script para transformar los 10,000 agentes desde base_agentes/v2/agents_seed_labeled.json
 * al formato esperado por Convex (panelAgents)
 * 
 * Uso:
 *   node scripts/transform10kAgents.js
 * 
 * Entrada:
 *   - base_agentes/v2/agents_seed_labeled.json
 * 
 * Salida:
 *   - agents_10k_transformed.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const INPUT_FILE = path.join(__dirname, '../base_agentes/v2/agents_seed_labeled.json');
const OUTPUT_FILE = path.join(__dirname, '../agents_10k_transformed.json');

// Mapa de GSE a inclinación política (aproximación basada en estudios sociológicos chilenos)
const GSE_POLITICAL_LEANING = {
  'AB': 45,   // Élite Alta - Tendencia centro-derecha
  'C1a': 30,  // Clase Media Acomodada - Tendencia centro-derecha
  'C1b': 15,  // Clase Media Emergente - Tendencia centro
  'C2': 0,    // Clase Media Típica - Tendencia centro
  'C3': -15,  // Clase Media Baja - Tendencia centro-izquierda
  'D': -25,   // Vulnerable - Tendencia izquierda
  'E': -35,   // Pobreza Extrema - Tendencia izquierda
};

// Intereses por GSE (estereotipos basados en nivel socioeconómico)
const GSE_INTERESTS = {
  'AB': ['economía', 'política', 'golf', 'tenis', 'viajes', 'vinos', 'arte', 'inversiones'],
  'C1a': ['tecnología', 'negocios', 'fitness', 'gastronomía', 'cine', 'música clásica'],
  'C1b': ['educación', 'carrera profesional', 'deportes', 'streaming', 'redes sociales'],
  'C2': ['fútbol', 'parrilladas', 'televisión', 'música popular', 'familia'],
  'C3': ['fútbol', 'música urbana', 'trabajo', 'familia', 'comunidad'],
  'D': ['fútbol', 'música popular', 'trabajo', 'familia', 'ayuda social'],
  'E': ['supervivencia', 'ayuda social', 'familia', 'comunidad', 'fe'],
};

// Intereses por grupo de edad
const AGE_INTERESTS = {
  '18-29': ['tecnología', 'redes sociales', 'música', 'videojuegos', 'deportes extremos'],
  '30-44': ['carrera', 'familia', 'hogar', 'fitness', 'viajes'],
  '45-59': ['estabilidad', 'hijos', 'jubilación', 'salud', 'trabajo'],
  '60+': ['jubilación', 'salud', 'nietos', 'pasatiempos', 'comunidad'],
};

// Función para determinar grupo de edad
function getAgeGroup(age) {
  if (age < 30) return '18-29';
  if (age < 45) return '30-44';
  if (age < 60) return '45-59';
  return '60+';
}

// Función para generar intereses combinados (GSE + edad)
function generateInterests(gse, age) {
  const gseInterests = GSE_INTERESTS[gse] || GSE_INTERESTS['C2'];
  const ageGroup = getAgeGroup(age);
  const ageInterests = AGE_INTERESTS[ageGroup] || AGE_INTERESTS['30-44'];
  
  // Combinar 2 intereses de GSE y 1 de edad
  const selectedGseInterests = gseInterests
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);
  const selectedAgeInterest = ageInterests
    .sort(() => Math.random() - 0.5)
    .slice(0, 1);
  
  return [...selectedGseInterests, ...selectedAgeInterest];
}

// Función para calcular inclinación política con variación
function calculatePoliticalLeaning(gse) {
  const base = GSE_POLITICAL_LEANING[gse] || 0;
  // Añadir variación aleatoria de ±15 puntos
  const variation = Math.floor(Math.random() * 30) - 15;
  return Math.max(-100, Math.min(100, base + variation));
}

// Función para determinar si el agente es visible (4.67% del total)
function isVisible(index, total) {
  // Hacer visible aproximadamente el 4.67% de los agentes
  // Usar distribución uniforme para que estén dispersos
  const threshold = 0.0467;
  return Math.random() < threshold;
}

// Función para generar coordenadas aleatorias en el mapa
function generateCoordinates() {
  // Mapa aproximado: 0-1024 en X, 0-768 en Y
  // Evitar bordes extremos
  const marginX = 50;
  const marginY = 50;
  
  return {
    x: Math.floor(Math.random() * (1024 - 2 * marginX)) + marginX,
    y: Math.floor(Math.random() * (768 - 2 * marginY)) + marginY,
  };
}

// Función principal de transformación
function transformAgent(agent, index) {
  const { x, y } = generateCoordinates();
  
  return {
    // Identificadores
    playerId: `p:${index}`,
    id_global: agent.id_global?.toString() || null,
    id_vivienda: agent.id_vivienda?.toString() || null,
    id_hogar: agent.id_hogar?.toString() || null,
    id_persona: agent.id_persona?.toString() || null,
    
    // Información personal
    name: agent.name || `Agente_${index + 1}`,
    age: parseInt(agent.age) || 30,
    sex: agent.sex?.toString() || null,
    age_group: agent.age_group || getAgeGroup(parseInt(agent.age) || 30),
    
    // Ubicación
    region: agent.region || 'Desconocida',
    provincia: agent.provincia?.toString() || null,
    comuna: agent.comuna?.toString() || '0',
    comuna_bajo_umbral: agent.comuna_bajo_umbral?.toString() || null,
    area: agent.area?.toString() || null,
    tipo_operativo: agent.tipo_operativo?.toString() || null,
    
    // Estado civil y familia
    parentesco: agent.parentesco?.toString() || null,
    p23_est_civil: agent.p23_est_civil?.toString() || null,
    p46a_tot_hijs_nac: agent.p46a_tot_hijs_nac?.toString() || null,
    p46b_hijas_nac: agent.p46b_hijas_nac?.toString() || null,
    p46c_hijos_nac: agent.p46c_hijos_nac?.toString() || null,
    p47a_tot_hijs_sobrev: agent.p47a_tot_hijs_sobrev?.toString() || null,
    p47b_hijas_sobrev: agent.p47b_hijas_sobrev?.toString() || null,
    p47c_hijos_sobrev: agent.p47c_hijos_sobrev?.toString() || null,
    
    // Nacionalidad y origen
    p24_lug_resid5: agent.p24_lug_resid5?.toString() || null,
    p24_lug_resid5_esp: agent.p24_lug_resid5_esp?.toString() || null,
    p25_lug_nacimiento: agent.p25_lug_nacimiento?.toString() || null,
    p25_lug_nacimiento_rec: agent.p25_lug_nacimiento_rec?.toString() || null,
    p25_lug_nacimiento_esp: agent.p25_lug_nacimiento_esp?.toString() || null,
    p26_llegada_periodo: agent.p26_llegada_periodo?.toString() || null,
    p27_nacionalidad: agent.p27_nacionalidad?.toString() || null,
    p27_nacionalidad_esp: agent.p27_nacionalidad_esp?.toString() || null,
    p27_nacionalidad_rec: agent.p27_nacionalidad_rec?.toString() || null,
    p28_autoid_pueblo: agent.p28_autoid_pueblo?.toString() || null,
    p28_pueblo_pert: agent.p28_pueblo_pert?.toString() || null,
    p29_afrodescendencia_rec: agent.p29_afrodescendencia_rec?.toString() || null,
    p29_afrodescendencia: agent.p29_afrodescendencia?.toString() || null,
    p30_lengua_indigena: agent.p30_lengua_indigena?.toString() || null,
    p30_lengua_indigena_rec: agent.p30_lengua_indigena_rec?.toString() || null,
    
    // Religión
    p31_religion: agent.p31_religion?.toString() || null,
    p31_religion_rec: agent.p31_religion_rec?.toString() || null,
    
    // Discapacidad
    p32a_dificultad_ver: agent.p32a_dificultad_ver?.toString() || null,
    p32b_dificultad_oir: agent.p32b_dificultad_oir?.toString() || null,
    p32c_dificultad_mover: agent.p32c_dificultad_mover?.toString() || null,
    p32d_dificultad_cogni: agent.p32d_dificultad_cogni?.toString() || null,
    p32e_dificultad_cuidado: agent.p32e_dificultad_cuidado?.toString() || null,
    p32f_dificultad_comunic: agent.p32f_dificultad_comunic?.toString() || null,
    discapacidad: agent.discapacidad?.toString() || null,
    
    // Educación
    p33_edu_asiste: agent.p33_edu_asiste?.toString() || null,
    asistencia_parv: agent.asistencia_parv?.toString() || null,
    asistencia_basica: agent.asistencia_basica?.toString() || null,
    asistencia_media: agent.asistencia_media?.toString() || null,
    asistencia_superior: agent.asistencia_superior?.toString() || null,
    p37_alfabet: agent.p37_alfabet?.toString() || null,
    escolaridad: agent.escolaridad?.toString() || null,
    cine11: agent.cine11?.toString() || null,
    
    // Trabajo
    sit_fuerza_trabajo: agent.sit_fuerza_trabajo?.toString() || null,
    p40_cise_rec: agent.p40_cise_rec?.toString() || null,
    depend_econ_deficit_hab: agent.depend_econ_deficit_hab?.toString() || null,
    cod_ciuo: agent.cod_ciuo?.toString() || null,
    cod_caenes: agent.cod_caenes?.toString() || null,
    p44_lug_trab: agent.p44_lug_trab?.toString() || null,
    p44_lug_trab_esp: agent.p44_lug_trab_esp?.toString() || null,
    p45_medio_transporte: agent.p45_medio_transporte?.toString() || null,
    
    // Género y diversidad
    div_genero: agent.div_genero?.toString() || null,
    
    // Grupo Socioeconómico
    gse: agent.gse_mapped || agent.gse || 'C2',
    
    // Redes sociales
    tiene_facebook: agent.tiene_facebook ?? null,
    tiene_instagram: agent.tiene_instagram ?? null,
    tiene_tiktok: agent.tiene_tiktok ?? null,
    tiene_x: agent.tiene_x ?? null,
    tiene_internet: agent.tiene_internet ?? true,
    
    // Campos del sistema
    politicalLeaning: calculatePoliticalLeaning(agent.gse_mapped || agent.gse || 'C2'),
    interests: generateInterests(agent.gse_mapped || agent.gse || 'C2', parseInt(agent.age) || 30),
    worldId: null, // Se asignará durante la carga
    isVisible: isVisible(index, 10000),
    x,
    y,
  };
}

// Función principal
async function main() {
  console.log('🔄 Transformación de 10,000 Agentes - Pulso Social');
  console.log('==================================================');
  console.log('');
  
  // Verificar archivo de entrada
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`✗ Error: No se encontró el archivo de entrada: ${INPUT_FILE}`);
    process.exit(1);
  }
  
  console.log(`📂 Leyendo archivo de entrada...`);
  console.log(`   ${INPUT_FILE}`);
  
  let agents;
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    agents = JSON.parse(rawData);
  } catch (error) {
    console.error(`✗ Error leyendo el archivo: ${error.message}`);
    process.exit(1);
  }
  
  console.log(`✓ ${agents.length} agentes cargados`);
  console.log('');
  
  // Transformar agentes
  console.log('🔄 Transformando agentes...');
  const transformedAgents = agents.map((agent, index) => transformAgent(agent, index));
  
  // Estadísticas
  const visibleCount = transformedAgents.filter(a => a.isVisible).length;
  const gseDistribution = {};
  const ageGroupDistribution = {};
  
  for (const agent of transformedAgents) {
    // Contar por GSE
    gseDistribution[agent.gse] = (gseDistribution[agent.gse] || 0) + 1;
    
    // Contar por grupo de edad
    ageGroupDistribution[agent.age_group] = (ageGroupDistribution[agent.age_group] || 0) + 1;
  }
  
  console.log('');
  console.log('📊 Estadísticas de transformación:');
  console.log('');
  console.log('   Distribución por GSE:');
  for (const [gse, count] of Object.entries(gseDistribution).sort()) {
    const percentage = ((count / transformedAgents.length) * 100).toFixed(2);
    console.log(`      ${gse}: ${count} (${percentage}%)`);
  }
  
  console.log('');
  console.log('   Distribución por Edad:');
  for (const [ageGroup, count] of Object.entries(ageGroupDistribution).sort()) {
    const percentage = ((count / transformedAgents.length) * 100).toFixed(2);
    console.log(`      ${ageGroup}: ${count} (${percentage}%)`);
  }
  
  console.log('');
  console.log(`   Agentes visibles: ${visibleCount} (${((visibleCount / transformedAgents.length) * 100).toFixed(2)}%)`);
  console.log('');
  
  // Guardar resultado
  console.log('💾 Guardando archivo transformado...');
  console.log(`   ${OUTPUT_FILE}`);
  
  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(transformedAgents, null, 2));
  } catch (error) {
    console.error(`✗ Error guardando el archivo: ${error.message}`);
    process.exit(1);
  }
  
  console.log('');
  console.log('==================================================');
  console.log('✅ Transformación completada exitosamente!');
  console.log('');
  console.log('Siguiente paso:');
  console.log('   node scripts/load10kAgents.js');
  console.log('');
}

main().catch(error => {
  console.error('Error no capturado:', error);
  process.exit(1);
});