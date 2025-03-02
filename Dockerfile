FROM oven/bun:alpine AS base

WORKDIR /usr/src/app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build -n web-client server

WORKDIR /usr/src/app/packages/server
ENTRYPOINT [ "bun", "run", "src/main.ts" ]
