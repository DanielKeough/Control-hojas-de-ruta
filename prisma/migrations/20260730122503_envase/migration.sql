-- AlterTable
ALTER TABLE "Remito" ADD COLUMN     "cantidadEnvases" INTEGER,
ADD COLUMN     "envaseId" INTEGER;

-- CreateTable
CREATE TABLE "Envase" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Envase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Envase_nombre_key" ON "Envase"("nombre");

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_envaseId_fkey" FOREIGN KEY ("envaseId") REFERENCES "Envase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

