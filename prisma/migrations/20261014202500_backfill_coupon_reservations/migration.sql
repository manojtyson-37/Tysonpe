-- Orders created before reservations existed: a paid coupon order already holds its redemption.
UPDATE "Order" SET "couponReserved" = 1 WHERE "couponId" IS NOT NULL AND "status" = 'paid' AND "couponReserved" = 0;

-- Invariant going forward: Coupon.redeemed = number of orders currently holding a reservation.
UPDATE "Coupon" SET "redeemed" = (
  SELECT COUNT(*) FROM "Order" o WHERE o."couponId" = "Coupon"."id" AND o."couponReserved" = 1
);
