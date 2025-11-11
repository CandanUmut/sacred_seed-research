import express from 'express';

export const metricsRouter = express.Router();

let snapshotsSentTotal = 0;
const bytesOutPerClient = new Map<string, number>();
const bytesOutPerRoom = new Map<string, number>();
const playersPerRoom = new Map<string, number>();
let roomCount = 0;
const tickHistogramBuckets = [1, 2, 3, 5, 8, 13];
const tickHistogram = new Array(tickHistogramBuckets.length + 1).fill(0);
const tickSamples: number[] = [];
const MAX_TICK_SAMPLES = 2000;
const startTime = Date.now();

export function addSnapshots(n: number): void {
  snapshotsSentTotal += n;
}

export function recordBytesOut(roomId: string, clientId: number, bytes: number): void {
  const key = `${roomId}:${clientId}`;
  bytesOutPerClient.set(key, (bytesOutPerClient.get(key) ?? 0) + bytes);
  bytesOutPerRoom.set(roomId, (bytesOutPerRoom.get(roomId) ?? 0) + bytes);
}

export function setPlayers(roomId: string, count: number): void {
  playersPerRoom.set(roomId, count);
}

export function setRoomCount(count: number): void {
  roomCount = count;
}

export function observeTickDuration(ms: number): void {
  let bucketIndex = tickHistogramBuckets.length;
  for (let i = 0; i < tickHistogramBuckets.length; i += 1) {
    if (ms <= tickHistogramBuckets[i]) {
      bucketIndex = i;
      break;
    }
  }
  tickHistogram[bucketIndex] += 1;
  tickSamples.push(ms);
  if (tickSamples.length > MAX_TICK_SAMPLES) {
    tickSamples.shift();
  }
}

metricsRouter.get('/metrics', (_req, res) => {
  let bytesOut = 0;
  for (const value of bytesOutPerClient.values()) {
    bytesOut += value;
  }
  const roomBytesOut = Array.from(bytesOutPerRoom.values()).reduce((acc, val) => acc + val, 0);
  const players = Array.from(playersPerRoom.values()).reduce((acc, value) => acc + value, 0);
  const buckets = tickHistogram
    .map((value, idx) => `server_tick_ms_histogram_bucket{le="${tickHistogramBuckets[idx] ?? '+Inf'}"} ${value}`)
    .join('\n');
  const quantiles = computeQuantiles(tickSamples, [0.95, 0.99]);
  const uptimeSeconds = Math.max(1, (Date.now() - startTime) / 1000);
  const avgSnapshotBytes = snapshotsSentTotal === 0 ? 0 : Math.round(bytesOut / snapshotsSentTotal);
  res
    .type('text/plain')
    .send(
      `${buckets}\n` +
        `server_tick_ms{quantile="0.95"} ${quantiles[0].toFixed(3)}\n` +
        `server_tick_ms{quantile="0.99"} ${quantiles[1].toFixed(3)}\n` +
        `snapshots_sent_total ${snapshotsSentTotal}\n` +
        `bytes_out_per_client ${bytesOut}\n` +
        `room_bytes_out_total ${roomBytesOut}\n` +
        `bytes_out_per_second ${(roomBytesOut / uptimeSeconds).toFixed(2)}\n` +
        `snapshot_bytes_avg ${avgSnapshotBytes}\n` +
        `clients_connected ${players}\n` +
        `rooms_active ${roomCount}\n`
    );
});

function computeQuantiles(samples: number[], probs: number[]): number[] {
  if (samples.length === 0) return probs.map(() => 0);
  const sorted = [...samples].sort((a, b) => a - b);
  return probs.map((p) => {
    const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
    return sorted[idx];
  });
}
