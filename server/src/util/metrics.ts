import express from 'express';

export const metricsRouter = express.Router();

let snapshotsSentTotal = 0;
const bytesOutPerClient = new Map<string, number>();
const playersPerRoom = new Map<string, number>();
let roomCount = 0;
const tickHistogramBuckets = [1, 2, 3, 5, 8, 13];
const tickHistogram = new Array(tickHistogramBuckets.length + 1).fill(0);

export function addSnapshots(n: number): void {
  snapshotsSentTotal += n;
}

export function recordBytesOut(roomId: string, clientId: number, bytes: number): void {
  const key = `${roomId}:${clientId}`;
  bytesOutPerClient.set(key, (bytesOutPerClient.get(key) ?? 0) + bytes);
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
}

metricsRouter.get('/metrics', (_req, res) => {
  let bytesOut = 0;
  for (const value of bytesOutPerClient.values()) {
    bytesOut += value;
  }
  const players = Array.from(playersPerRoom.values()).reduce((acc, value) => acc + value, 0);
  const buckets = tickHistogram
    .map((value, idx) => `server_tick_ms_histogram_bucket{le="${tickHistogramBuckets[idx] ?? '+Inf'}"} ${value}`)
    .join('\n');
  res
    .type('text/plain')
    .send(
      `${buckets}\n` +
        `snapshots_sent_total ${snapshotsSentTotal}\n` +
        `bytes_out_per_client ${bytesOut}\n` +
        `players_per_room ${players}\n` +
        `rooms_total ${roomCount}\n`
    );
});
