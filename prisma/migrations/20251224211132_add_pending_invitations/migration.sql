-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'REGISTERED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvitationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');

-- CreateTable
CREATE TABLE "pending_invitations" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "contactValue" TEXT NOT NULL,
    "contactName" TEXT,
    "channel" "InvitationChannel" NOT NULL,
    "invitationToken" TEXT NOT NULL,
    "invitationLink" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "pending_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_invitations_invitationToken_key" ON "pending_invitations"("invitationToken");

-- CreateIndex
CREATE INDEX "pending_invitations_sellerId_idx" ON "pending_invitations"("sellerId");

-- CreateIndex
CREATE INDEX "pending_invitations_contactValue_idx" ON "pending_invitations"("contactValue");

-- CreateIndex
CREATE INDEX "pending_invitations_invitationToken_idx" ON "pending_invitations"("invitationToken");

-- CreateIndex
CREATE INDEX "pending_invitations_status_idx" ON "pending_invitations"("status");

-- AddForeignKey
ALTER TABLE "pending_invitations" ADD CONSTRAINT "pending_invitations_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
