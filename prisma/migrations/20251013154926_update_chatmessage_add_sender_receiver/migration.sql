/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `chat_messages` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `receiverId` to the `chat_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderId` to the `chat_messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "receiverId" TEXT NOT NULL,
ADD COLUMN     "senderId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_idempotencyKey_key" ON "chat_messages"("idempotencyKey");

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "chat_messages_receiverId_idx" ON "chat_messages"("receiverId");
