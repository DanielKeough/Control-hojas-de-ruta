-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('LOGISTICA', 'PORTERIA', 'ADMINISTRACION');

-- CreateEnum
CREATE TYPE "EstadoHojaRuta" AS ENUM ('ABIERTA', 'CONTROLADA', 'FACTURADA');

-- CreateEnum
CREATE TYPE "RecepcionEstado" AS ENUM ('PENDIENTE', 'TOTAL', 'PARCIAL');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('PENDIENTE', 'ENTREGADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transportista" (
    "id" SERIAL NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "controlKmHabilitado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Transportista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conductor" (
    "id" SERIAL NOT NULL,
    "apellido" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "transportistaId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camion" (
    "id" SERIAL NOT NULL,
    "patente" TEXT NOT NULL,
    "transportistaId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Camion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acoplado" (
    "id" SERIAL NOT NULL,
    "patente" TEXT NOT NULL,
    "transportistaId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Acoplado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sucursal" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "domicilio" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HojaRuta" (
    "id" SERIAL NOT NULL,
    "fechaHoraEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transportistaId" INTEGER NOT NULL,
    "camionId" INTEGER NOT NULL,
    "acopladoId" INTEGER,
    "conductorId" INTEGER NOT NULL,
    "ticketPesadaBalanza" TEXT,
    "estado" "EstadoHojaRuta" NOT NULL DEFAULT 'ABIERTA',
    "usuarioCreadorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HojaRuta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HojaRutaDetalle" (
    "id" SERIAL NOT NULL,
    "hojaRutaId" INTEGER NOT NULL,
    "ordenPrioridad" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "sucursalId" INTEGER NOT NULL,
    "domicilioEntrega" TEXT NOT NULL,
    "numeroTurno" TEXT,
    "horaTurno" TEXT,
    "rangoHorarioDesde" TEXT,
    "rangoHorarioHasta" TEXT,
    "numeroOrdenCompra" TEXT,
    "kmInicio" DOUBLE PRECISION,
    "horaInicioTramo" TEXT,
    "kmFin" DOUBLE PRECISION,
    "horaFinTramo" TEXT,

    CONSTRAINT "HojaRutaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Remito" (
    "id" SERIAL NOT NULL,
    "detalleId" INTEGER NOT NULL,
    "numeroRemito" TEXT NOT NULL,
    "kilosDespachados" DOUBLE PRECISION NOT NULL,
    "palletsDespachados" INTEGER NOT NULL,
    "cantidadIfco" INTEGER NOT NULL DEFAULT 0,
    "numeroRemitoIfco" TEXT,
    "recepcionEstado" "RecepcionEstado" NOT NULL DEFAULT 'PENDIENTE',
    "kilosRecepcionados" DOUBLE PRECISION,
    "palletsArlog" INTEGER,
    "palletsDescartable" INTEGER,
    "ifcoRecibidos" INTEGER,
    "ifcoRechazados" INTEGER,
    "fechaControl" TIMESTAMP(3),
    "usuarioControlId" INTEGER,
    "estadoEntrega" "EstadoEntrega" NOT NULL DEFAULT 'PENDIENTE',
    "numeroFactura" TEXT,
    "fechaImputacion" TIMESTAMP(3),
    "usuarioImputacionId" INTEGER,

    CONSTRAINT "Remito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Conductor_dni_key" ON "Conductor"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Camion_patente_key" ON "Camion"("patente");

-- CreateIndex
CREATE UNIQUE INDEX "Acoplado_patente_key" ON "Acoplado"("patente");

-- AddForeignKey
ALTER TABLE "Conductor" ADD CONSTRAINT "Conductor_transportistaId_fkey" FOREIGN KEY ("transportistaId") REFERENCES "Transportista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camion" ADD CONSTRAINT "Camion_transportistaId_fkey" FOREIGN KEY ("transportistaId") REFERENCES "Transportista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acoplado" ADD CONSTRAINT "Acoplado_transportistaId_fkey" FOREIGN KEY ("transportistaId") REFERENCES "Transportista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sucursal" ADD CONSTRAINT "Sucursal_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRuta" ADD CONSTRAINT "HojaRuta_transportistaId_fkey" FOREIGN KEY ("transportistaId") REFERENCES "Transportista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRuta" ADD CONSTRAINT "HojaRuta_camionId_fkey" FOREIGN KEY ("camionId") REFERENCES "Camion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRuta" ADD CONSTRAINT "HojaRuta_acopladoId_fkey" FOREIGN KEY ("acopladoId") REFERENCES "Acoplado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRuta" ADD CONSTRAINT "HojaRuta_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRuta" ADD CONSTRAINT "HojaRuta_usuarioCreadorId_fkey" FOREIGN KEY ("usuarioCreadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRutaDetalle" ADD CONSTRAINT "HojaRutaDetalle_hojaRutaId_fkey" FOREIGN KEY ("hojaRutaId") REFERENCES "HojaRuta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRutaDetalle" ADD CONSTRAINT "HojaRutaDetalle_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRutaDetalle" ADD CONSTRAINT "HojaRutaDetalle_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_detalleId_fkey" FOREIGN KEY ("detalleId") REFERENCES "HojaRutaDetalle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_usuarioControlId_fkey" FOREIGN KEY ("usuarioControlId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_usuarioImputacionId_fkey" FOREIGN KEY ("usuarioImputacionId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
