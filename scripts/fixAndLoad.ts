import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import readline from "readline";
import * as dotenv from "dotenv";
import path from "path";

// @ts-ignore - ConvexHttpClient accepts string function references

// Cargar variables de entorno desde .env.local
dotenv.config({ path: ".env.local" });

const convexUrl = process.env.VITE_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("Falta VITE_CONVEX_URL o NEXT_PUBLIC_CONVEX_URL en .env.local");

const client = new ConvexHttpClient(convexUrl);

// RUTA A TU ARCHIVO DE DATOS
const DATA_FILE = "agents.jsonl";

// Función para obtener el worldId por defecto
async function getDefaultWorldId(): Promise<string> {
  // @ts-ignore
  const worldId = await client.query("pulso:getDefaultWorldId", {});
  return worldId;
}

async function processLineByLine() {
  const filePath = path.join(process.cwd(), DATA_FILE);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ No encuentro el archivo: ${filePath}`);
    console.error("Asegúrate de que el archivo agents.jsonl esté en la raíz.");
    return;
  }

  // Obtener el worldId
  const worldId = await getDefaultWorldId();
  console.log(`🌍 Usando worldId: ${worldId}`);

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let batch: any[] = [];
  const BATCH_SIZE = 500;
  let count = 0;

  console.log("🚀 Iniciando limpieza y carga de agentes...");

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
        worldId: worldId, // ID del mundo obtenido dinámicamente
        isVisible: raw.isVisible !== undefined ? raw.isVisible : Math.random() < 0.05,
        x: 32 + Math.floor(Math.random() * 10),
        y: 32 + Math.floor(Math.random() * 10),
      };

      batch.push(cleanAgent);

      // Subir lote cuando llegue a 500
      if (batch.length >= BATCH_SIZE) {
        // @ts-ignore
        await client.mutation("pulso:bulkInsertPanelAgents", { agents: batch });
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
    // @ts-ignore
    await client.mutation("pulso:bulkInsertPanelAgents", { agents: batch });
    count += batch.length;
    console.log(`✅ Cargados finales: ${count}`);
  }

  console.log(`🎉 ¡Terminado! Se cargaron ${count} agentes limpios.`);
}

processLineByLine();
