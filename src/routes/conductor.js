const express = require('express');
const prisma = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireRole('CONDUCTOR'));

function toNullableFloat(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
function toNullableString(v) {
  if (v === undefined || v === null || v === '') return null;
  return v;
}

router.get('/', async (req, res) => {
  if (!req.user.conductorId) {
    return res.status(400).render('error', {
      title: 'Usuario sin conductor vinculado',
      mensaje: 'Tu usuario no tiene un conductor vinculado. Pedile a Administración que lo configure en Maestros > Usuarios.',
    });
  }
  const hojas = await prisma.hojaRuta.findMany({
    where: { conductorId: req.user.conductorId, transportista: { controlKmHabilitado: true } },
    include: { transportista: true, camion: true },
    orderBy: { id: 'desc' },
    take: 50,
  });
  res.render('conductor/lista', { title: 'Mis Viajes', hojas });
});

router.get('/:id', async (req, res) => {
  const hoja = await prisma.hojaRuta.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      transportista: true,
      camion: true,
      detalles: { include: { cliente: true, sucursal: true }, orderBy: { ordenPrioridad: 'asc' } },
    },
  });
  if (!hoja) return res.status(404).render('error', { title: 'No encontrada', mensaje: 'La hoja de ruta no existe.' });
  if (hoja.conductorId !== req.user.conductorId) {
    return res.status(403).render('error', { title: 'Acceso denegado', mensaje: 'Esta hoja de ruta no te pertenece.' });
  }
  if (!hoja.transportista.controlKmHabilitado) {
    return res.status(400).render('error', {
      title: 'No aplica',
      mensaje: 'Este transporte no requiere carga de kilometraje y hora por tramo.',
    });
  }
  res.render('conductor/viaje', { title: `Viaje HR-${String(hoja.id).padStart(6, '0')}`, hoja, error: null });
});

router.post('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const hoja = await prisma.hojaRuta.findUnique({
    where: { id },
    include: { transportista: true, detalles: true },
  });
  if (!hoja) return res.status(404).render('error', { title: 'No encontrada', mensaje: 'La hoja de ruta no existe.' });
  if (hoja.conductorId !== req.user.conductorId) {
    return res.status(403).render('error', { title: 'Acceso denegado', mensaje: 'Esta hoja de ruta no te pertenece.' });
  }
  if (!hoja.transportista.controlKmHabilitado) {
    return res.status(400).render('error', { title: 'No aplica', mensaje: 'Este transporte no requiere ese dato.' });
  }

  const detallesBody = req.body.detalles || {};
  const detallesPorId = new Map(hoja.detalles.map((d) => [d.id, d]));

  await prisma.$transaction(async (tx) => {
    for (const [detalleKey, d] of Object.entries(detallesBody)) {
      const detalleId = Number(detalleKey.replace(/^d/, ''));
      const detalleActual = detallesPorId.get(detalleId);
      if (!detalleActual || detalleActual.tramoValidado) continue; // ya validado por Porteria: no se puede modificar
      await tx.hojaRutaDetalle.update({
        where: { id: detalleId },
        data: {
          kmInicio: toNullableFloat(d.kmInicio),
          horaInicioTramo: toNullableString(d.horaInicioTramo),
          kmFin: toNullableFloat(d.kmFin),
          horaFinTramo: toNullableString(d.horaFinTramo),
        },
      });
    }
  });

  res.redirect(`/mis-viajes/${id}`);
});

module.exports = router;
