FROM node:23-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/

ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/app.js"]