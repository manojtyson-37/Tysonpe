-- Invoice numbers are consecutive per seller, so uniqueness is per (seller, number), not global.
DROP INDEX "Order_invoiceNo_key";

-- CreateIndex
CREATE UNIQUE INDEX "Order_creatorId_invoiceNo_key" ON "Order"("creatorId", "invoiceNo");
