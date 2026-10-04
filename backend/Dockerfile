FROM node:23-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
COPY prisma.config.ts ./prisma.config.ts
# prisma.config.ts chama env("DATABASE_URL"), por isso o generate precisa de
# uma variavel presente. O valor real vem do runtime (entrypoint.sh -> migrate deploy).
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/placeholder" npx prisma generate

RUN npm ci --omit=dev

COPY src ./src/
COPY assets ./assets/
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV PORT=3000
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]