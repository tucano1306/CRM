-- AddDeliveryInstructions
-- Agregar campo deliveryInstructions a la tabla orders

ALTER TABLE "orders" ADD COLUMN "deliveryInstructions" TEXT;
