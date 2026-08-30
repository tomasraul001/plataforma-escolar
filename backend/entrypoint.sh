#!/bin/sh
npx prisma db push
exec node src/app.js