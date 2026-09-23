#!/bin/sh
npx prisma migrate deploy
exec node src/app.js