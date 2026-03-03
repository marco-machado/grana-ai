-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'CREDIT', 'SAVINGS');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('EMAIL', 'CSV', 'API', 'MANUAL');

-- CreateEnum
CREATE TYPE "StagingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "description_raw" TEXT NOT NULL,
    "description_clean" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "account_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "category_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StagingTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "description_raw" TEXT NOT NULL,
    "description_clean" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "account_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "category_id" UUID,
    "category_suggestion" TEXT,
    "confidence_score" DECIMAL(3,2),
    "status" "StagingStatus" NOT NULL DEFAULT 'PENDING',
    "statement_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StagingTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedStatement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "statement_hash" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_account_id_type_identifier_key" ON "Source"("account_id", "type", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_parent_id_key" ON "Category"("name", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_account_id_date_amount_description_raw_key" ON "Transaction"("account_id", "date", "amount", "description_raw");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedStatement_statement_hash_key" ON "ProcessedStatement"("statement_hash");

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagingTransaction" ADD CONSTRAINT "StagingTransaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagingTransaction" ADD CONSTRAINT "StagingTransaction_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagingTransaction" ADD CONSTRAINT "StagingTransaction_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedStatement" ADD CONSTRAINT "ProcessedStatement_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
