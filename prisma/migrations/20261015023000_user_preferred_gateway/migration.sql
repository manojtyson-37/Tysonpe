-- Which gateway's checkout (Razorpay or Easebuzz) the demo shows this user. Existing users default to Razorpay.
ALTER TABLE "User" ADD COLUMN "preferredGateway" TEXT NOT NULL DEFAULT 'razorpay';
