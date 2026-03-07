import * as fs from 'fs';
import * as readline from 'readline';

const inputFile = 'agents_transformed.jsonl';
const outputFile = 'agents_transformed_fixed.jsonl';
const correctWorldId = 'm17a392bywc3418a0smxa5rybn828634';

async function fixWorldId() {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const writeStream = fs.createWriteStream(outputFile);
  let count = 0;

  for await (const line of rl) {
    const obj = JSON.parse(line);
    obj.worldId = correctWorldId;
    writeStream.write(JSON.stringify(obj) + '\n');
    count++;
  }

  writeStream.end();
  console.log(`Updated ${count} records with worldId: ${correctWorldId}`);
  console.log(`Output file: ${outputFile}`);
}

fixWorldId().catch(console.error);
