-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT,
ADD COLUMN "sexo" TEXT;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "sexo" TEXT;

-- AlterTable
ALTER TABLE "Class" ADD COLUMN "archivedAt" TIMESTAMP(3);
