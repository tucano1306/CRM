/*
  Warnings:

  - You are about to drop the `order_ratings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "order_ratings" DROP CONSTRAINT "order_ratings_client_id_fkey";

-- DropForeignKey
ALTER TABLE "order_ratings" DROP CONSTRAINT "order_ratings_order_id_fkey";

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "attachmentSize" INTEGER,
ADD COLUMN     "attachmentType" TEXT,
ADD COLUMN     "attachmentUrl" TEXT;

-- DropTable
DROP TABLE "order_ratings";
