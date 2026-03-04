-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecurringType" AS ENUM ('SUBSCRIPTION', 'BILL', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "InstallmentFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "installment_group_id" UUID,
ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_savings_transfer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurring_item_id" UUID,
ADD COLUMN     "saving_goal_id" UUID;

-- CreateTable
CREATE TABLE "Budget" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "period" DATE,
    "status" "BudgetStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "next_date" DATE NOT NULL,
    "type" "RecurringType" NOT NULL,
    "category_id" UUID,
    "account_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "description" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "installments_total" INTEGER NOT NULL,
    "frequency" "InstallmentFrequency" NOT NULL,
    "start_date" DATE NOT NULL,
    "category_id" UUID,
    "account_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallmentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingGoal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "target_amount" DECIMAL(12,2) NOT NULL,
    "deadline" DATE,
    "linked_account_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Budget_category_id_period_key" ON "Budget"("category_id", "period");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentGroup" ADD CONSTRAINT "InstallmentGroup_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentGroup" ADD CONSTRAINT "InstallmentGroup_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingGoal" ADD CONSTRAINT "SavingGoal_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurring_item_id_fkey" FOREIGN KEY ("recurring_item_id") REFERENCES "RecurringItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_installment_group_id_fkey" FOREIGN KEY ("installment_group_id") REFERENCES "InstallmentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_saving_goal_id_fkey" FOREIGN KEY ("saving_goal_id") REFERENCES "SavingGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique index: one default template (period IS NULL) per category
-- Prisma's @@unique cannot express WHERE clauses; this enforces uniqueness for NULL periods
CREATE UNIQUE INDEX "Budget_category_id_null_period_key" ON "Budget" ("category_id") WHERE "period" IS NULL;
