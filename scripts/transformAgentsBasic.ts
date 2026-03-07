import * as fs from 'fs';
import * as readline from 'readline';

const inputFile = 'agents.jsonl';
const outputFile = 'agents_basic.jsonl';
const correctWorldId = 'm17a392bywc3418a0smxa5rybn828634';

async function transformAgents() {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const writeStream = fs.createWriteStream(outputFile);
  let count = 0;

  for await (const line of rl) {
    const raw = JSON.parse(line);
    count++;

    // Solo incluir los campos que están en el schema actual de Convex
    const transformed = {
      playerId: raw.id || `p:${count}`,
      name: raw.name || `Agente_${count}`,
      age: Number(raw.edad || raw.age || 30),
      gse: raw.gse || "C2",
      region: raw.region || "Metropolitana",
      comuna: raw.comuna || "Santiago",
      politicalLeaning: Math.floor(Math.random() * 200) - 100,
      interests: ["NACIONAL"],
      worldId: correctWorldId,
      isVisible: raw.isVisible !== undefined ? raw.isVisible : Math.random() < 0.05,
      x: 32 + Math.floor(Math.random() * 10),
      y: 32 + Math.floor(Math.random() * 10),
    };

    writeStream.write(JSON.stringify(transformed) + '\n');
  }

  writeStream.end();
  console.log(`Transformed ${count} agents to ${outputFile}`);
}

transformAgents().catch(console.error);
