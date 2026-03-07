import fs from "fs";
import readline from "readline";
import path from "path";

const INPUT_FILE = "agents.jsonl";
const OUTPUT_FILE = "agents_transformed.jsonl";

async function transformAgents() {
  const inputPath = path.join(process.cwd(), INPUT_FILE);
  const outputPath = path.join(process.cwd(), OUTPUT_FILE);

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ No encuentro el archivo: ${inputPath}`);
    return;
  }

  const fileStream = fs.createReadStream(inputPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const outputStream = fs.createWriteStream(outputPath);
  let count = 0;

  console.log("🔄 Transformando agentes...");

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const raw = JSON.parse(line);

      // Transformar al formato de panelAgents
      const transformed = {
        playerId: raw.id || `p:${count}`,
        name: raw.name || `Ciudadano ${count}`,
        age: Number(raw.edad || raw.age || 30),
        gse: raw.gse || "C2",
        region: raw.region || "Metropolitana",
        comuna: raw.comuna || "Santiago",
        politicalLeaning: Math.floor(Math.random() * 200) - 100,
        interests: ["NACIONAL"],
        worldId: "world", // Será actualizado después
        isVisible: raw.isVisible !== undefined ? raw.isVisible : Math.random() < 0.05,
        x: 32 + Math.floor(Math.random() * 10),
        y: 32 + Math.floor(Math.random() * 10),
      };

      outputStream.write(JSON.stringify(transformed) + "\n");
      count++;

      if (count % 1000 === 0) {
        console.log(`✅ Transformados: ${count}`);
      }
    } catch (err) {
      console.warn("⚠️ Error procesando una línea:", err);
    }
  }

  outputStream.end();
  console.log(`🎉 ¡Terminado! Se transformaron ${count} agentes.`);
  console.log(`📁 Archivo de salida: ${OUTPUT_FILE}`);
  console.log("");
  console.log("⚠️ IMPORTANTE: El campo 'worldId' está configurado como 'world'.");
  console.log("   Necesitas obtener el worldId correcto del Dashboard de Convex y actualizar el archivo.");
  console.log("");
  console.log("Para actualizar el worldId, ejecuta:");
  console.log(`  sed -i '' 's/"worldId": "world"/"worldId": "<tu-world-id>"/g' ${OUTPUT_FILE}`);
}

transformAgents();
