#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const base = JSON.parse(readFileSync(join(__dirname, '../base_agentes/v2/agents_seed.json'), 'utf-8'));
const labeled = JSON.parse(readFileSync(join(__dirname, '../base_agentes/v2/agents_seed_labeled.json'), 'utf-8'));

const baseFields = new Set(Object.keys(base[0]));
const labeledFields = new Set(Object.keys(labeled[0]));

const extraInLabeled = [...labeledFields].filter(f => !baseFields.has(f));
const missingInLabeled = [...baseFields].filter(f => !labeledFields.has(f));

console.log('=== Comparación de Campos ===\n');
console.log('Campos en base:', baseFields.size);
console.log('Campos en labeled:', labeledFields.size);
console.log('');
console.log('Campos adicionales en labeled (diccionario):', extraInLabeled.length);
console.log(extraInLabeled);
console.log('');
console.log('Campos faltantes en labeled:', missingInLabeled.length);
console.log(missingInLabeled);
