const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

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
      detalles: { include: { cliente: true, sucursal: true, remitos: { include: { envase: true } } }, orderBy: { ordenPrioridad: 'asc' } },
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
    const detallesBody = req.body.detalles || {};

    await prisma.$transaction(async (tx) => {
      await tx.hojaRuta.update({
        where: { id },
        data: {
          ticketPesadaBalanza: req.body.ticketPesadaBalanza || null,
          tara: toNullableFloat(req.body.tara),
          pesoBruto: toNullableFloat(req.body.pesoBruto),
        },
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
            fechaControl: new Date(),
            usuarioControlId: req.user.id,
          },
        });
      }
      for (const [detalleKey, d] of Object.entries(detallesBody)) {
        const validado = d.tramoValidado === 'on' || d.tramoValidado === 'true';
        await tx.hojaRutaDetalle.update({
          where: { id: Number(detalleKey.replace(/^d/, '')) },
          data: {
            tramoValidado: validado,
            tramoValidadoPorId: validado ? req.user.id : null,
            tramoValidadoFecha: validado ? new Date() : null,
          },
        });
      }
      // El pesaje (ticket/tara/peso bruto) se puede cargar en cualquier momento
      // sin cerrar la hoja. Solo pasa a CONTROLADA cuando ya se registro la
      // recepcion de todos los remitos en destino.
      if (existente.estado === 'ABIERTA') {
        const remitosActuales = await tx.remito.findMany({ where: { detalle: { hojaRutaId: id } } });
        const hayRemitos = remitosActuales.length > 0;
        const todosControlados = hayRemitos && remitosActuales.every((r) => r.recepcionEstado !== 'PENDIENTE');
        if (todosControlados) {
          await tx.hojaRuta.update({ where: { id }, data: { estado: 'CONTROLADA' } });
        }
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
        detalles: { include: { cliente: true, sucursal: true, remitos: { include: { envase: true } } }, orderBy: { ordenPrioridad: 'asc' } },
      },
    });
    res.status(400).render('control/control', { title: `Control Hoja de Ruta #${id}`, hoja, error: err.message });
  }
});

module.exports = router;
