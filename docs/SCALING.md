# Scaling the Live Service

This document explains how to run the multiplayer service across multiple processes and hosts while maintaining interest-managed rooms.

## Redis transport

The Socket.IO server supports an optional Redis adapter. Set `REDIS_URL=redis://localhost:6379` (or your cluster URL) before starting the server. The adapter is configured in `server/src/net/RedisAdapter.ts`. When enabled, room events and presence updates are fanned out through Redis Pub/Sub allowing multiple Node.js processes to share the same namespace.

Development: use `docker-compose up redis` to start the bundled Redis container. Production: point the environment variable at your managed Redis instance.

## Room sharding

`RoomManager` can run in multiple worker processes. Each process owns a shard of rooms. The matchmaker service (`server/src/matchmaking/Service.ts`) maintains lightweight metadata for every shard: how many players are present, which tracks are active, and health checks. The service exposes:

- `GET /rooms` — current room list with load info.
- `POST /reserve` — returns the best shard and room id to join.

Workers register themselves on boot and send heartbeat pings every 2 seconds. Sticky routing is achieved by hashing the room id into the worker id; HTTP reverse proxies such as Nginx or Caddy can forward requests based on this id.

## Sticky Socket.IO

When running behind a load balancer ensure that WebSocket upgrade requests honour sticky sessions. With Redis in place it is not required for correctness but reduces cross-node chatter. For Kubernetes deployments use the `service.beta.kubernetes.io/aws-load-balancer-backend-protocol: tcp` annotation and session affinity.

## Horizontal scaling workflow

1. Launch Redis.
2. Start N server processes with `ROOM_SHARD=<index>/<total>` and `PORT` per process.
3. Run the matchmaker service once (can be colocated) and point clients at it.
4. Clients request a room allocation via `/rooms/reserve` and then connect to the suggested host/room.

Refer to `docs/LOADTEST.md` for stress tooling and metrics expectations.

