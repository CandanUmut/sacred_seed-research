FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
RUN npm install --ignore-scripts
COPY . .
RUN npm run build --workspace=shared && npm run build --workspace=server

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./dist
ENV PORT=8787
CMD ["node", "dist/index.js"]
