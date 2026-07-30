require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'cambiar123';
  const adminNombre = process.env.ADMIN_NOMBRE || 'Administrador';

  const existingAdmin = await prisma.usuario.findUnique({ where: { username: adminUsername } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.usuario.create({
      data: {
        username: adminUsername,
        passwordHash,
        nombre: adminNombre,
      },
    });
    console.log(`Usuario creado: ${adminUsername} / ${adminPassword}`);
  } else {
    console.log('El usuario administrador ya existe, no se recrea.');
  }

  // Usuarios de ejemplo (solo si no existen)
  const ejemplos = [
    { username: 'administracion', password: 'admin123', nombre: 'Usuario Administracion' },
    { username: 'logistica', password: 'logistica123', nombre: 'Usuario Logistica' },
    { username: 'porteria', password: 'porteria123', nombre: 'Usuario Porteria' },
  ];
  for (const u of ejemplos) {
    const existe = await prisma.usuario.findUnique({ where: { username: u.username } });
    if (!existe) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await prisma.usuario.create({
        data: { username: u.username, passwordHash, nombre: u.nombre },
      });
      console.log(`Usuario creado: ${u.username} / ${u.password}`);
    }
  }

  // Transportista de ejemplo con control de kilometraje habilitado
  const montiMedia = await prisma.transportista.upsert({
    where: { id: 1 },
    update: {},
    create: { razonSocial: 'Monti Media', controlKmHabilitado: true },
  });
  const transporteGenerico = await prisma.transportista.upsert({
    where: { id: 2 },
    update: {},
    create: { razonSocial: 'Transporte Generico SA', controlKmHabilitado: false },
  });

  await prisma.conductor.upsert({
    where: { dni: '20111222' },
    update: {},
    create: { apellido: 'Perez', nombre: 'Juan', dni: '20111222', transportistaId: montiMedia.id },
  });
  await prisma.conductor.upsert({
    where: { dni: '25333444' },
    update: {},
    create: { apellido: 'Gomez', nombre: 'Carlos', dni: '25333444', transportistaId: transporteGenerico.id },
  });

  await prisma.camion.upsert({
    where: { patente: 'AB-123-XZ' },
    update: {},
    create: { patente: 'AB-123-XZ', transportistaId: montiMedia.id },
  });
  await prisma.camion.upsert({
    where: { patente: 'PIP-801' },
    update: {},
    create: { patente: 'PIP-801', transportistaId: transporteGenerico.id },
  });

  const cliente = await prisma.cliente.upsert({
    where: { id: 1 },
    update: {},
    create: { razonSocial: 'Cliente de Ejemplo SA' },
  });
  await prisma.sucursal.upsert({
    where: { id: 1 },
    update: {},
    create: {
      clienteId: cliente.id,
      nombre: 'Casa Central',
      domicilio: 'Av. Siempreviva 123, Buenos Aires',
    },
  });

  const tiposEnvase = ['Bin', 'Pallet', 'Cajas', 'Tambores', 'Unidades', 'Bultos'];
  for (const nombre of tiposEnvase) {
    await prisma.envase.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
