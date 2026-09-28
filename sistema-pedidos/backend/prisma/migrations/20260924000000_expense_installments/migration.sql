-- AlterTable
ALTER TABLE "User" ADD COLUMN "receiveOrderEmails" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "isInstallment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "installmentId" INTEGER;

-- CreateTable
CREATE TABLE "ExpenseInstallment" (
    "id" SERIAL NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseInstallment_expenseId_idx" ON "ExpenseInstallment"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseInstallment_dueDate_idx" ON "ExpenseInstallment"("dueDate");

-- CreateIndex
CREATE INDEX "ExpenseInstallment_paid_idx" ON "ExpenseInstallment"("paid");

-- CreateIndex
CREATE INDEX "Notification_installmentId_idx" ON "Notification"("installmentId");

-- AddForeignKey
ALTER TABLE "ExpenseInstallment" ADD CONSTRAINT "ExpenseInstallment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "ExpenseInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
