/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `saved_carts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "saved_carts_user_id_key" ON "saved_carts"("user_id");
