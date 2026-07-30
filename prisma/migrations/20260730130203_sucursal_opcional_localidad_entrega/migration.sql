-- DropForeignKey
ALTER TABLE "HojaRutaDetalle" DROP CONSTRAINT "HojaRutaDetalle_sucursalId_fkey";

-- AlterTable
ALTER TABLE "HojaRutaDetalle" ADD COLUMN     "localidadEntrega" TEXT,
ADD COLUMN     "provinciaEntrega" TEXT,
ALTER COLUMN "sucursalId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "HojaRutaDetalle" ADD CONSTRAINT "HojaRutaDetalle_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

