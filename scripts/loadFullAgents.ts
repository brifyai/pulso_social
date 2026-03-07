import { ConvexHttpClient } from "convex/browser";
import * as fs from 'fs';
import * as readline from 'readline';

const CONVEX_URL = process.env.VITE_CONVEX_URL || "https://energetic-cuttlefish-560.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

const inputFile = 'agents_full.jsonl';
const BATCH_SIZE = 50;

async function loadAgents() {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let batch = [];
  let totalLoaded = 0;

  for await (const line of rl) {
    const agent = JSON.parse(line);
    batch.push(agent);

    if (batch.length >= BATCH_SIZE) {
      await loadBatch(batch);
      totalLoaded += batch.length;
      console.log(`Loaded ${totalLoaded} agents...`);
      batch = [];
    }
  }

  // Load remaining agents
  if (batch.length > 0) {
    await loadBatch(batch);
    totalLoaded += batch.length;
  }

  console.log(`✅ Total loaded: ${totalLoaded} agents`);
}

async function loadBatch(agents: any[]) {
  try {
    // @ts-ignore
    await client.mutation("pulso:loadFullAgents", { agents });
  } catch (error) {
    console.error("Error loading batch:", error);
    throw error;
  }
}

loadAgents().catch(console.error);
