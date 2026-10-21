-- CreateTable
CREATE TABLE "platform_announcements" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "title" TEXT,
    "message" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_announcements_active_startsAt_endsAt_idx" ON "platform_announcements"("active", "startsAt", "endsAt");

-- Seed tips for businesses
INSERT INTO "platform_announcements" ("id", "type", "title", "message", "active", "sortOrder", "updatedAt") VALUES
  (gen_random_uuid()::text, 'text', 'Consejo', 'Responde rápido: aceptar un pedido en menos de 3 minutos mejora la experiencia de tus clientes.', true, 0, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'text', 'Consejo', 'Fotos claras y bien iluminadas pueden aumentar las ventas de un producto hasta un 30%.', true, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'text', 'Consejo', 'Mantén tu horario actualizado: un negocio abierto cuando dice estar abierto genera confianza.', true, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'text', 'Consejo', 'Crea paquetes y combos: suben el ticket promedio y facilitan la decisión del cliente.', true, 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'text', 'Consejo', 'Revisa tus reseñas cada semana y responde a las áreas de mejora con acciones concretas.', true, 4, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'text', 'Consejo', 'Una promoción en horas bajas ayuda a llenar tu cocina cuando más lo necesitas.', true, 5, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'text', 'Consejo', 'Describe tus platillos con ingredientes y porciones: menos dudas, más pedidos.', true, 6, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'text', 'Consejo', 'Comparte tu código de referido con otros negocios y obtén descuento en tu suscripción.', true, 7, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'text', 'Consejo', 'Confirma las transferencias pronto: tus clientes esperan su pedido y lo agradecerán.', true, 8, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'text', 'Consejo', 'Un empaque limpio y seguro es tu mejor tarjeta de presentación en cada entrega.', true, 9, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'text', 'Consejo', 'Pausa o desactiva los productos agotados para evitar cancelaciones y malas experiencias.', true, 10, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'text', 'Consejo', 'Agradece a tus clientes frecuentes con una promoción exclusiva: fidelizar cuesta menos que captar.', true, 11, CURRENT_TIMESTAMP);
