# Stage 1: builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY src/ ./src/
RUN npm run build

# Stage 2: runner
FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY src/ ./src/

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000

CMD ["node", "-r", "dotenv/config", "src/server"]
