#!/usr/bin/env node

/**
 * Script para cargar el diccionario en Convex
 * 
 * Uso:
 *   node scripts/loadDictionary.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ConvexHttpClient } from 'convex/browser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const DEPLOYMENT_URL = 'https://energetic-cuttlefish-560.convex.cloud';
const BATCH_SIZE = 100; // Entradas por lote

async function main() {
  console.log('📚 Cargando diccionario en Convex...\n');

  // Leer el archivo labeled
  const labeledFile = join(__dirname, '../base_agentes/v2/agents_seed_labeled.json');
  console.log(`📖 Leyendo ${labeledFile}...`);
  
  let labeledData;
  try {
    labeledData = JSON.parse(readFileSync(labeledFile, 'utf-8'));
    console.log(`✓ ${labeledData.length} registros leídos\n`);
  } catch (error) {
    console.error(`✗ Error leyendo archivo: ${error.message}`);
    process.exit(1);
  }

  // Extraer entradas únicas del diccionario
  // El formato esperado por la función es un array de objetos con campos _label
  const dictionaryEntries = [];
  const seen = new Set();

  for (const entry of labeledData) {
    // Extraer solo los campos relevantes para el diccionario
    const dictEntry = {};
    
    // Campos a extraír (campo y su label correspondiente)
    const fields = [
      { code: 'sexo', label: 'sexo_label' },
      { code: 'area', label: 'area_label' },
      { code: 'comuna', label: 'comuna_label' },
      { code: 'comuna_bajo_umbral', label: 'comuna_bajo_umbral_label' },
      { code: 'parentesco', label: 'parentesco_label' },
      { code: 'tipo_operativo', label: 'tipo_operativo_label' },
      { code: 'provincia', label: 'provincia_label' },
      { code: 'gse_mapped', label: 'gse_mapped_label' },
    ];

    for (const field of fields) {
      const code = entry[field.code];
      const label = entry[field.label];
      
      if (code !== undefined && code !== null && label) {
        const key = `${field.code}:${code}`;
        if (!seen.has(key)) {
          seen.add(key);
          // La función espera el formato original con code y label
          dictEntry[field.code] = code;
          dictEntry[field.label] = label;
        }
      }
    }

    // Solo agregar si tiene al menos un campo
    if (Object.keys(dictEntry).length > 0) {
      dictionaryEntries.push(dictEntry);
    }
  }

  console.log(`📊 Entradas únicas extraídas: ${dictionaryEntries.length}\n`);
  console.log('Resumen por campo:');
  const byField = {};
  for (const entry of dictionaryEntries) {
    for (const [key, value] of Object.entries(entry)) {
      if (!key.endsWith('_label')) {
        const field = key;
        if (!byField[field]) {
          byField[field] = new Set();
        }
        byField[field].add(value);
      }
    }
  }
  for (const [field, codes] of Object.entries(byField)) {
    console.log(`  - ${field}: ${codes.size} valores únicos`);
  }
  console.log('');

  // Convertir a array y dividir en lotes
  const totalBatches = Math.ceil(dictionaryEntries.length / BATCH_SIZE);
  
  let totalLoaded = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  // Cargar en lotes usando Convex HttpClient
  const client = new ConvexHttpClient(DEPLOYMENT_URL);
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, dictionaryEntries.length);
    const batch = dictionaryEntries.slice(start, end);
    
    console.log(`🔄 Cargando lote ${i + 1}/${totalBatches} (${batch.length} entradas)...`);
    
    try {
      // Usar la action que no requiere autenticación
      const result = await client.action('aiTown/scalableMigration:loadDictionaryAction', {
        entries: batch,
      });
      
      totalLoaded += result.loaded || 0;
      totalUpdated += result.updated || 0;
      totalSkipped += result.skipped || 0;
      
      console.log(`✓ ${result.loaded || 0} cargados, ${result.updated || 0} actualizados, ${result.skipped || 0} saltados\n`);
      
    } catch (error) {
      console.error(`✗ Error en lote ${i + 1}: ${error.message}`);
    }

    // Pequeña pausa entre lotes
    if (i < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('');
  console.log('=== Resumen ===');
  console.log(`✓ Total cargados: ${totalLoaded}`);
  console.log(`✓ Total actualizados: ${totalUpdated}`);
  console.log(`✓ Total saltados: ${totalSkipped}`);
  console.log(`✓ Total procesados: ${totalLoaded + totalUpdated + totalSkipped}`);
  console.log('');
  console.log('✨ Diccionario cargado exitosamente!');
}

main().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});