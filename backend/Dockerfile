FROM node:23-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

RUN npm ci --omit=dev

COPY src ./src/
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV PORT=3000
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]