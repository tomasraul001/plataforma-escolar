-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trainerId" TEXT NOT NULL,
    "trainingAreaId" TEXT,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "classId" TEXT NOT NULL,
    "studentId" TEXT,
    "manualName" TEXT,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classId" TEXT NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradebookTemplate" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradebookTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "classId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingArea_name_key" ON "TrainingArea"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingArea_code_key" ON "TrainingArea"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Class_code_key" ON "Class"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Class_secretKey_key" ON "Class"("secretKey");

-- CreateIndex
CREATE UNIQUE INDEX "GradebookTemplate_classId_key" ON "GradebookTemplate"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_classId_studentId_key" ON "Enrollment"("classId", "studentId");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_trainingAreaId_fkey" FOREIGN KEY ("trainingAreaId") REFERENCES "TrainingArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradebookTemplate" ADD CONSTRAINT "GradebookTemplate_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
