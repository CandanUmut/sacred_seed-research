import type { Server as IOServer } from 'socket.io';

export async function applyRedisAdapter(io: IOServer): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    return;
  }

  const { createAdapter } = await import('@socket.io/redis-adapter');
  const { createClient } = await import('redis');
  const pubClient = createClient({ url });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
}
