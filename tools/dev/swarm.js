import { Bot } from './bot.js';

const bots = Number.parseInt(process.env.BOTS ?? '8', 10);
const durationSeconds = Number.parseInt(process.env.DURATION ?? '120', 10);
const url = process.env.SERVER_URL ?? 'ws://localhost:8787';

async function main() {
  console.log(`Launching ${bots} bots against ${url} for ${durationSeconds}s`);
  const tasks = Array.from({ length: bots }, (_, idx) => {
    const bot = new Bot(idx, url);
    return bot.start(durationSeconds * 1000);
  });
  await Promise.all(tasks);
  console.log('Swarm complete');
}

main().catch((error) => {
  console.error('Swarm failed', error);
  process.exit(1);
});
