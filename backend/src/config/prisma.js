import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), "backend/.env") });

import { PrismaClient } from "../../generated/prisma/client.ts"

console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');

const prisma = new PrismaClient()

export default prisma 