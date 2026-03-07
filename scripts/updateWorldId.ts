import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import readline from "readline";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ".env.local" });

const convexUrl = process.env.VITE_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("Falta VITE_CONVEX_URL o NEXT_PUBLIC_CONVEX_URL en .env.local");

const client = new ConvexHttpClient(convexUrl);

async function getWorldId() {
  try {
    // Intentar obtener el worldId de la tabla worlds
    const worlds = await client.query("world:listWorlds", {});
    if (worlds && worlds.length > 0) {
      return worlds[0]._id;
    }
  } catch (e) {
    console.log("⚠️ No se pudo obtener worldId de world:listWorlds");
  }

  // Si falla, intentar con un valor por defecto
  return null;
}

async function updateWorldIdInFile(worldId: string | null) {
  const inputFile = "agents_transformed.jsonl";
  const outputFile = "agents_final.jsonl";

  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const outputStream = fs.createWriteStream(outputFile);
  let count = 0;

  console.log(`🔄 Actualizando worldId a: ${worldId || "world"}`);

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const agent = JSON.parse(line);
      agent.worldId = worldId || "world";
      outputStream.write(JSON.stringify(agent) + "\n");
      count++;

      if (count % 1000 === 0) {
        console.log(`✅ Actualizados: ${count}`);
      }
    } catch (err) {
      console.warn("⚠️ Error procesando una línea:", err);
    }
  }

  outputStream.end();
  console.log(`🎉 ¡Terminado! Se actualizaron ${count} agentes.`);
  console.log(`📁 Archivo de salida: ${outputFile}`);
}

async function main() {
  const worldId = await getWorldId();
  await updateWorldIdInFile(worldId);
}

main();
