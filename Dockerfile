FROM oven/bun:alpine AS install
WORKDIR /usr/src/app
COPY . .
RUN install --frozen-lockfile
RUN bun run build -n web-client server
WORKDIR /usr/src/app/packages/server
CMD ["bun", "run", "src/main.ts"]
