// Coordenadas X, Y para cada Región en un mapa de 64x64
export const REGION_CENTERS: Record<string, { x: number; y: number }> = {
  // Fila 1 (Norte)
  "Arica y Parinacota": { x: 8, y: 8 },
  "Tarapacá": { x: 24, y: 8 },
  "Antofagasta": { x: 40, y: 8 },
  "Atacama": { x: 56, y: 8 },

  // Fila 2 (Centro Norte)
  "Coquimbo": { x: 8, y: 24 },
  "Valparaíso": { x: 24, y: 24 },
  "Metropolitana": { x: 40, y: 24 }, // ¡Aquí vivirán 4.000 agentes!
  "O'Higgins": { x: 56, y: 24 },

  // Fila 3 (Centro Sur)
  "Maule": { x: 8, y: 40 },
  "Ñuble": { x: 24, y: 40 },
  "Biobío": { x: 40, y: 40 },
  "La Araucanía": { x: 56, y: 40 },

  // Fila 4 (Sur Austral)
  "Los Ríos": { x: 8, y: 56 },
  "Los Lagos": { x: 24, y: 56 },
  "Aysén": { x: 40, y: 56 },
  "Magallanes": { x: 56, y: 56 },
};

// Función para obtener posición de spawn con ruido aleatorio
export function getSpawnPos(region: string): { x: number; y: number } {
  const center = REGION_CENTERS[region] || { x: 32, y: 32 };
  
  // Variación de +/- 2 tiles alrededor del centro
  const x = center.x + Math.floor(Math.random() * 5) - 2;
  const y = center.y + Math.floor(Math.random() * 5) - 2;
  
  return { x, y };
}

// Lista de todas las regiones
export const ALL_REGIONS = Object.keys(REGION_CENTERS);
