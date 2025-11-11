export interface MetricsSnapshot {
  rooms: number;
  players: number;
}

const metrics: MetricsSnapshot = {
  rooms: 0,
  players: 0,
};

export function setRooms(count: number): void {
  metrics.rooms = count;
}

export function setPlayers(count: number): void {
  metrics.players = count;
}

export function getMetrics(): MetricsSnapshot {
  return { ...metrics };
}
