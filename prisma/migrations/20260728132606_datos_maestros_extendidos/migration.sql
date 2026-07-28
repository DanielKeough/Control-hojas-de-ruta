-- CreateEnum
CREATE TYPE "TipoCamion" AS ENUM ('TRACTOR', 'CHASIS');

-- CreateEnum
CREATE TYPE "CondicionConductor" AS ENUM ('RELACION_DEPENDENCIA', 'INDEPENDIENTE');

-- AlterTable
ALTER TABLE "Acoplado" ADD COLUMN     "anio" INTEGER,
ADD COLUMN     "capacidadPallets" INTEGER,
ADD COLUMN     "companiaSeguro" TEXT,
ADD COLUMN     "marca" TEXT,
ADD COLUMN     "modelo" TEXT,
ADD COLUMN     "numeroPoliza" TEXT,
ADD COLUMN     "vencimientoSeguro" TIMESTAMP(3),
ADD COLUMN     "vencimientoVtv" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Camion" ADD COLUMN     "anio" INTEGER,
ADD COLUMN     "capacidadPallets" INTEGER,
ADD COLUMN     "companiaSeguro" TEXT,
ADD COLUMN     "marca" TEXT,
ADD COLUMN     "modelo" TEXT,
ADD COLUMN     "numeroPoliza" TEXT,
ADD COLUMN     "tipo" "TipoCamion",
ADD COLUMN     "vencimientoSeguro" TIMESTAMP(3),
ADD COLUMN     "vencimientoVtv" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "codigoPostal" TEXT,
ADD COLUMN     "cuit" TEXT,
ADD COLUMN     "domicilio" TEXT,
ADD COLUMN     "localidad" TEXT,
ADD COLUMN     "provincia" TEXT;

-- AlterTable
ALTER TABLE "Conductor" ADD COLUMN     "categoriaOtraDetalle" TEXT,
ADD COLUMN     "categoriasHabilitantes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "condicion" "CondicionConductor",
ADD COLUMN     "empleador" TEXT,
ADD COLUMN     "fechaNacimiento" TIMESTAMP(3),
ADD COLUMN     "registroConducirNumero" TEXT,
ADD COLUMN     "registroConducirVencimiento" TIMESTAMP(3),
ADD COLUMN     "seguroAccidentesCompania" TEXT,
ADD COLUMN     "seguroAccidentesPersonales" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seguroVidaCompania" TEXT,
ADD COLUMN     "seguroVidaObligatorio" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Sucursal" ADD COLUMN     "codigoPostal" TEXT,
ADD COLUMN     "contacto" TEXT,
ADD COLUMN     "denominacion" TEXT,
ADD COLUMN     "horario" TEXT,
ADD COLUMN     "localidad" TEXT,
ADD COLUMN     "notas" TEXT,
ADD COLUMN     "numeroSucursal" TEXT,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "provincia" TEXT;

-- AlterTable
ALTER TABLE "Transportista" ADD COLUMN     "codigoPostal" TEXT,
ADD COLUMN     "cuit" TEXT,
ADD COLUMN     "domicilio" TEXT,
ADD COLUMN     "localidad" TEXT,
ADD COLUMN     "provincia" TEXT;

