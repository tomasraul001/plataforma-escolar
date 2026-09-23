import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../..", ".env") });

import { PrismaClient } from "../../generated/prisma/client.ts"

console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');

const prisma = new PrismaClient()

export default prisma 