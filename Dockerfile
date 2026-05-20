FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY src/ ./src/

ARG BASE_URL
ENV BASE_URL=$BASE_URL

RUN npm run build

# ---

FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json package-lock.json ./
ENV NODE_ENV=production
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY src/ ./src/

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000

CMD ["node", "-r", "dotenv/config", "src/server"]
