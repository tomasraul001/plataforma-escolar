#!/bin/sh
npx prisma generate
npx prisma migrate deploy
exec node src/app.js