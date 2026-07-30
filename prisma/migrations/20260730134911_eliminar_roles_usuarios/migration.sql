-- DropForeignKey
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_conductorId_fkey";

-- DropIndex
DROP INDEX "Usuario_conductorId_key";

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "conductorId",
DROP COLUMN "rol";

-- DropEnum
DROP TYPE "Rol";

