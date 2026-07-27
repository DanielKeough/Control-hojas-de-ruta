const express = require('express');
const prisma = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireRole('ADMINISTRACION'));

router.get('/', async (req, res) => {
  const hojas = await prisma.hojaRuta.findMany({
    where: { estado: { in: ['CONTROLADA', 'FACTURADA'] } },
    include: { transportista: true, camion: true },
    orderBy: { id: 'desc' },
    take: 200,
  });
  res.render('facturacion/buscar', { title: 'Imputación de Factura - Buscar', hojas });
});

router.get('/:id', async (req, res) => {
  const hoja = await prisma.hojaRuta.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      transportista: true,
      camion: true,
      conductor: true,
      detalles: { include: { cliente: true, sucursal: true, remitos: true }, orderBy: { ordenPrioridad: 'asc' } },
    },
  });
  if (!hoja) return res.status(404).render('error', { title: 'No encontrada', mensaje: 'La hoja de ruta no existe.' });
  res.render('facturacion/imputar', { title: `Imputación Hoja de Ruta #${hoja.id}`, hoja, error: null });
});

router.post('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existente = await prisma.hojaRuta.findUnique({ where: { id } });
    if (!existente) return res.status(404).render('error', { title: 'No encontrada', mensaje: 'La hoja de ruta no existe.' });

    const remitosBody = req.body.remitos || {};

    await prisma.$transaction(async (tx) => {
      for (const [remitoId, r] of Object.entries(remitosBody)) {
        const estadoEntrega = r.estadoEntrega || 'PENDIENTE';
        await tx.remito.update({
          where: { id: Number(remitoId) },
          data: {
            estadoEntrega,
            numeroFactura: estadoEntrega === 'ENTREGADO' ? (r.numeroFactura || null) : null,
            fechaImputacion: estadoEntrega === 'PENDIENTE' ? null : new Date(),
            usuarioImputacionId: estadoEntrega === 'PENDIENTE' ? null : req.user.id,
          },
        });
      }
      const remitosActuales = await tx.remito.findMany({ where: { detalle: { hojaRutaId: id } } });
      const todosImputados = remitosActuales.every((r) => r.estadoEntrega !== 'PENDIENTE');
      if (todosImputados) {
        await tx.hojaRuta.update({ where: { id }, data: { estado: 'FACTURADA' } });
      } else if (existente.estado === 'FACTURADA') {
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
        conductor: true,
        detalles: { include: { cliente: true, sucursal: true, remitos: true }, orderBy: { ordenPrioridad: 'asc' } },
      },
    });
    res.status(400).render('facturacion/imputar', { title: `Imputación Hoja de Ruta #${id}`, hoja, error: err.message });
  }
});

module.exports = router;
