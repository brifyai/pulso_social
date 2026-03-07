import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import readline from "readline";
import * as dotenv from "dotenv";
import path from "path";

// Cargar variables de entorno desde .env.local
dotenv.config({ path: ".env.local" });

// Usar la URL del deployment de producción por defecto
const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("Falta CONVEX_URL, VITE_CONVEX_URL o NEXT_PUBLIC_CONVEX_URL en .env.local");

const client = new ConvexHttpClient(convexUrl);

// RUTA A TU ARCHIVO DE DATOS
const DATA_FILE = "agents.jsonl";

// WorldId - Puedes obtenerlo del Dashboard de Convex
// Para obtener el worldId, ve al Dashboard de Convex > Tables > worlds > copia el _id
const WORLD_ID = process.env.WORLD_ID || "";

async function processLineByLine() {
  const filePath = path.join(process.cwd(), DATA_FILE);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ No encuentro el archivo: ${filePath}`);
    console.error("Asegúrate de que el archivo agents.jsonl esté en la raíz.");
    return;
  }

  let worldId = WORLD_ID;
  
  // Si no se proporcionó worldId, usar un valor por defecto
  if (!worldId) {
    console.log("⚠️ No se proporcionó WORLD_ID.");
    console.log("💡 Para obtener el worldId:");
    console.log("   1. Ve al Dashboard de Convex: https://dashboard.convex.dev");
    console.log("   2. Navega a Tables > worlds");
    console.log("   3. Copia el _id del mundo");
    console.log("   4. Ejecuta: WORLD_ID=<tu-world-id> npx ts-node scripts/loadAgents.ts");
    console.log("");
    console.log("🔄 Intentando usar un worldId por defecto...");
    worldId = "world"; // Intentar con un valor por defecto
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let batch: any[] = [];
  const BATCH_SIZE = 500;
  let count = 0;

  console.log("🚀 Iniciando limpieza y carga de agentes...");
  console.log(`📁 Archivo: ${DATA_FILE}`);
  console.log(`🌍 World ID: ${worldId}`);

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const raw = JSON.parse(line);

      // MAPEO DE CAMPOS - Ajustado al schema de panelAgents
      const cleanAgent = {
        playerId: raw.id || `p:${count}`,
        name: raw.name || `Ciudadano ${count}`,
        age: Number(raw.edad || raw.age || 30),
        gse: raw.gse || "C2",
        region: raw.region || "Metropolitana",
        comuna: raw.comuna || "Santiago",
        politicalLeaning: Math.floor(Math.random() * 200) - 100, // -100 a 100
        interests: ["NACIONAL"], // Default
        worldId: worldId,
        isVisible: raw.isVisible !== undefined ? raw.isVisible : Math.random() < 0.05,
        x: 32 + Math.floor(Math.random() * 10),
        y: 32 + Math.floor(Math.random() * 10),
      };

      batch.push(cleanAgent);

      // Subir lote cuando llegue a 500
      if (batch.length >= BATCH_SIZE) {
        // @ts-ignore - Usando mutación pública
        await client.mutation("pulso:bulkInsertPublic", { agents: batch });
        count += batch.length;
        console.log(`✅ Cargados: ${count}`);
        batch = [];
      }
    } catch (err) {
      console.warn("⚠️ Error procesando una línea:", err);
    }
  }

  // Subir el resto
  if (batch.length > 0) {
    // @ts-ignore - Usando mutación pública
    await client.mutation("pulso:bulkInsertPublic", { agents: batch });
    count += batch.length;
    console.log(`✅ Cargados finales: ${count}`);
  }

  console.log(`🎉 ¡Terminado! Se cargaron ${count} agentes limpios.`);
}

processLineByLine();
