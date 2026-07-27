-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'CONDUCTOR';

-- AlterTable
ALTER TABLE "HojaRutaDetalle" ADD COLUMN     "tramoValidado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tramoValidadoFecha" TIMESTAMP(3),
ADD COLUMN     "tramoValidadoPorId" INTEGER;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "conductorId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_conductorId_key" ON "Usuario"("conductorId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRutaDetalle" ADD CONSTRAINT "HojaRutaDetalle_tramoValidadoPorId_fkey" FOREIGN KEY ("tramoValidadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

