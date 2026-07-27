const express = require('express');
const prisma = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireRole('PORTERIA', 'ADMINISTRACION'));

function toNullableFloat(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
function toNullableInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

router.get('/', async (req, res) => {
  const hojas = await prisma.hojaRuta.findMany({
    include: { transportista: true, camion: true },
    orderBy: { id: 'desc' },
    take: 200,
  });
  res.render('control/buscar', { title: 'Control y Cierre - Buscar', hojas });
});

router.get('/:id', async (req, res) => {
  const hoja = await prisma.hojaRuta.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      transportista: true,
      camion: true,
      acoplado: true,
      conductor: true,
      detalles: { include: { cliente: true, sucursal: true, remitos: true }, orderBy: { ordenPrioridad: 'asc' } },
    },
  });
  if (!hoja) return res.status(404).render('error', { title: 'No encontrada', mensaje: 'La hoja de ruta no existe.' });
  res.render('control/control', { title: `Control Hoja de Ruta #${hoja.id}`, hoja, error: null });
});

router.post('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existente = await prisma.hojaRuta.findUnique({ where: { id } });
    if (!existente) return res.status(404).render('error', { title: 'No encontrada', mensaje: 'La hoja de ruta no existe.' });

    const remitosBody = req.body.remitos || {};

    await prisma.$transaction(async (tx) => {
      await tx.hojaRuta.update({
        where: { id },
        data: { ticketPesadaBalanza: req.body.ticketPesadaBalanza || null },
      });
      for (const [remitoKey, r] of Object.entries(remitosBody)) {
        await tx.remito.update({
          where: { id: Number(remitoKey.replace(/^r/, '')) },
          data: {
            recepcionEstado: r.recepcionEstado || 'PENDIENTE',
            kilosRecepcionados: toNullableFloat(r.kilosRecepcionados),
            palletsArlog: toNullableInt(r.palletsArlog),
            palletsDescartable: toNullableInt(r.palletsDescartable),
            ifcoRecibidos: toNullableInt(r.ifcoRecibidos),
            ifcoRechazados: toNullableInt(r.ifcoRechazados),
            fechaControl: new Date(),
            usuarioControlId: req.user.id,
          },
        });
      }
      if (existente.estado === 'ABIERTA') {
        await tx.hojaRuta.update({ where: { id }, data: { estado: 'CONTROLADA' } });
      }
    });

    res.redirect(`/hojas-ruta/${id}`);
  } catch (err) {
    const hoja = await prisma.hojaRuta.findUnique({
      where: { id },
      include: {
        transportista: true,
        camion: true,
        acoplado: true,
        conductor: true,
        detalles: { include: { cliente: true, sucursal: true, remitos: true }, orderBy: { ordenPrioridad: 'asc' } },
      },
    });
    res.status(400).render('control/control', { title: `Control Hoja de Ruta #${id}`, hoja, error: err.message });
  }
});

module.exports = router;
