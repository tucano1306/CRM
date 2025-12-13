-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedReason" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "substituteName" TEXT,
ADD COLUMN     "substitutedWith" TEXT;
