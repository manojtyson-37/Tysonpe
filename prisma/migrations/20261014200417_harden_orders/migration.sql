-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "seq" INTEGER NOT NULL DEFAULT 0
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "couponId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "subtotalPaise" INTEGER NOT NULL,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "totalPaise" INTEGER NOT NULL,
    "gstPaise" INTEGER NOT NULL,
    "gstRatePct" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "couponReserved" BOOLEAN NOT NULL DEFAULT false,
    "providerOrderId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "invoiceNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "refundedAt" DATETIME,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("couponId", "createdAt", "creatorId", "discountPaise", "gstPaise", "gstRatePct", "id", "invoiceNo", "paidAt", "productId", "provider", "providerOrderId", "providerPaymentId", "refundedAt", "status", "subtotalPaise", "totalPaise", "userId") SELECT "couponId", "createdAt", "creatorId", "discountPaise", "gstPaise", "gstRatePct", "id", "invoiceNo", "paidAt", "productId", "provider", "providerOrderId", "providerPaymentId", "refundedAt", "status", "subtotalPaise", "totalPaise", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_providerOrderId_key" ON "Order"("providerOrderId");
CREATE UNIQUE INDEX "Order_invoiceNo_key" ON "Order"("invoiceNo");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_creatorId_status_idx" ON "Order"("creatorId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
