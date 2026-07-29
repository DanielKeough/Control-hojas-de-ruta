const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

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
function toNullableString(v) {
  if (v === undefined || v === null || v === '') return null;
  return v;
}

function parseDetalles(rawDetalles) {
  const arr = Array.isArray(rawDetalles) ? rawDetalles : Object.values(rawDetalles || {});
  return arr.map((d, idx) => {
    const rawRemitos = d.remitos;
    const remitosArr = Array.isArray(rawRemitos) ? rawRemitos : Object.values(rawRemitos || {});
    return {
      ordenPrioridad: toNullableInt(d.ordenPrioridad) || idx + 1,
      clienteId: parseInt(d.clienteId, 10),
      sucursalId: parseInt(d.sucursalId, 10),
      domicilioEntrega: d.domicilioEntrega || '',
      numeroTurno: toNullableString(d.numeroTurno),
      horaTurno: toNullableString(d.horaTurno),
      rangoHorarioDesde: toNullableString(d.rangoHorarioDesde),
      rangoHorarioHasta: toNullableString(d.rangoHorarioHasta),
      numeroOrdenCompra: toNullableString(d.numeroOrdenCompra),
      kmInicio: toNullableFloat(d.kmInicio),
      horaInicioTramo: toNullableString(d.horaInicioTramo),
      kmFin: toNullableFloat(d.kmFin),
      horaFinTramo: toNullableString(d.horaFinTramo),
      remitos: {
        create: remitosArr
          .filter((r) => r.numeroRemito)
          .map((r) => ({
            numeroRemito: r.numeroRemito,
            kilosDespachados: toNullableFloat(r.kilosDespachados) || 0,
            palletsDespachados: toNullableInt(r.palletsDespachados) || 0,
            cantidadIfco: toNullableInt(r.cantidadIfco) || 0,
            numeroRemitoIfco: toNullableString(r.numeroRemitoIfco),
          })),
      },
    };
  }).filter((d) => !Number.isNaN(d.clienteId) && !Number.isNaN(d.sucursalId));
}

async function loadFormData() {
  const [transportistas, camiones, acoplados, conductores, clientes, sucursales] = await Promise.all([
    prisma.transportista.findMany({ where: { activo: true }, orderBy: { razonSocial: 'asc' } }),
    prisma.camion.findMany({ where: { activo: true }, orderBy: { patente: 'asc' } }),
    prisma.acoplado.findMany({ where: { activo: true }, orderBy: { patente: 'asc' } }),
    prisma.conductor.findMany({ where: { activo: true }, orderBy: { apellido: 'asc' } }),
    prisma.cliente.findMany({ where: { activo: true }, orderBy: { razonSocial: 'asc' } }),
    prisma.sucursal.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
  ]);
  return { transportistas, camiones, acoplados, conductores, clientes, sucursales };
}

const includeCompleto = {
  transportista: true,
  camion: true,
  acoplado: true,
  conductor: true,
  usuarioCreador: true,
  detalles: {
    include: { cliente: true, sucursal: true, remitos: { include: { usuarioControl: true, usuarioImputacion: true } } },
    orderBy: { ordenPrioridad: 'asc' },
  },
};

router.get('/', async (req, res) => {
  const { numero } = req.query;
  const where = numero ? { id: parseInt(numero, 10) || 0 } : {};
  if (req.user.rol === 'CONDUCTOR') {
    where.conductorId = req.user.conductorId || 0;
  }
  const hojas = await prisma.hojaRuta.findMany({
    where,
    include: { transportista: true, camion: true, conductor: true },
    orderBy: { id: 'desc' },
    take: 200,
  });
  res.render('hojas-ruta/lista', { title: 'Hojas de Ruta', hojas, numero: numero || '' });
});

router.get('/nueva', requireRole('LOGISTICA', 'PORTERIA', 'ADMINISTRACION', 'SUPERUSUARIO'), async (req, res) => {
  const formData = await loadFormData();
  // Porteria siempre carga solo el encabezado (ingreso del camion). Logistica,
  // Administracion y Superusuario pueden elegir ese mismo modo simplificado
  // agregando ?modo=ingreso al link (ver nav/dashboard).
  const soloEncabezado = req.user.rol === 'PORTERIA' || req.query.modo === 'ingreso';
  res.render('hojas-ruta/form', {
    title: soloEncabezado ? 'Ingreso de Camión' : 'Nueva Hoja de Ruta',
    hoja: null,
    soloEncabezado,
    ...formData,
    error: null,
  });
});

router.post('/', requireRole('LOGISTICA', 'PORTERIA', 'ADMINISTRACION', 'SUPERUSUARIO'), async (req, res) => {
  const formData = await loadFormData();
  const body = req.body;
  const soloEncabezado = body.soloEncabezado === '1';
  try {
    const data = {
      fechaHoraEmision: body.fechaHoraEmision ? new Date(body.fechaHoraEmision) : new Date(),
      transportistaId: parseInt(body.transportistaId, 10),
      camionId: parseInt(body.camionId, 10),
      acopladoId: toNullableInt(body.acopladoId),
      conductorId: parseInt(body.conductorId, 10),
      ticketPesadaBalanza: toNullableString(body.ticketPesadaBalanza),
      tara: toNullableFloat(body.tara),
      pesoBruto: toNullableFloat(body.pesoBruto),
      usuarioCreadorId: req.user.id,
      detalles: { create: parseDetalles(body.detalles) },
    };
    const hoja = await prisma.hojaRuta.create({ data });
    res.redirect(`/hojas-ruta/${hoja.id}`);
  } catch (err) {
    res.status(400).render('hojas-ruta/form', {
      title: soloEncabezado ? 'Ingreso de Camión' : 'Nueva Hoja de Ruta',
      hoja: null,
      soloEncabezado,
      ...formData,
      error: err.message,
    });
  }
});

router.get('/:id', async (req, res) => {
  const hoja = await prisma.hojaRuta.findUnique({ where: { id: Number(req.params.id) }, include: includeCompleto });
  if (!hoja) return res.status(404).render('error', { title: 'No encontrada', mensaje: 'La hoja de ruta no existe.' });
  if (req.user.rol === 'CONDUCTOR' && hoja.conductorId !== req.user.conductorId) {
    return res.status(403).render('error', { title: 'Acceso denegado', mensaje: 'Esta hoja de ruta no te pertenece.' });
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.render('hojas-ruta/ver', { title: `Hoja de Ruta #${hoja.id}`, hoja, baseUrl });
});

router.get('/:id/imprimir', async (req, res) => {
  const hoja = await prisma.hojaRuta.findUnique({ where: { id: Number(req.params.id) }, include: includeCompleto });
  if (!hoja) return res.status(404).render('error', { title: 'No encontrada', mensaje: 'La hoja de ruta no existe.' });
  if (req.user.rol === 'CONDUCTOR' && hoja.conductorId !== req.user.conductorId) {
    return res.status(403).render('error', { title: 'Acceso denegado', mensaje: 'Esta hoja de ruta no te pertenece.' });
  }
  res.render('hojas-ruta/imprimir', { title: `Imprimir Hoja de Ruta #${hoja.id}`, hoja, layout: false });
});

router.get('/:id/editar', requireRole('LOGISTICA', 'ADMINISTRACION', 'SUPERUSUARIO'), async (req, res) => {
  const hoja = await prisma.hojaRuta.findUnique({ where: { id: Number(req.params.id) }, include: includeCompleto });
  if (!hoja) return res.status(404).render('error', { title: 'No encontrada', mensaje: 'La hoja de ruta no existe.' });
  if (hoja.estado !== 'ABIERTA') {
    return res.status(400).render('error', {
      title: 'No editable',
      mensaje: 'Esta hoja de ruta ya fue controlada y no puede editarse desde Logística.',
    });
  }
  const formData = await loadFormData();
  res.render('hojas-ruta/form', { title: `Editar Hoja de Ruta #${hoja.id}`, hoja, ...formData, error: null });
});

router.post('/:id', requireRole('LOGISTICA', 'ADMINISTRACION', 'SUPERUSUARIO'), async (req, res) => {
  const id = Number(req.params.id);
  const formData = await loadFormData();
  try {
    const existente = await prisma.hojaRuta.findUnique({ where: { id } });
    if (!existente) return res.status(404).render('error', { title: 'No encontrada', mensaje: 'La hoja de ruta no existe.' });
    if (existente.estado !== 'ABIERTA') {
      return res.status(400).render('error', { title: 'No editable', mensaje: 'Esta hoja de ruta ya fue controlada y no puede editarse.' });
    }
    const body = req.body;
    await prisma.$transaction(async (tx) => {
      await tx.hojaRutaDetalle.deleteMany({ where: { hojaRutaId: id } });
      await tx.hojaRuta.update({
        where: { id },
        data: {
          fechaHoraEmision: body.fechaHoraEmision ? new Date(body.fechaHoraEmision) : existente.fechaHoraEmision,
          transportistaId: parseInt(body.transportistaId, 10),
          camionId: parseInt(body.camionId, 10),
          acopladoId: toNullableInt(body.acopladoId),
          conductorId: parseInt(body.conductorId, 10),
          ticketPesadaBalanza: toNullableString(body.ticketPesadaBalanza),
          tara: toNullableFloat(body.tara),
          pesoBruto: toNullableFloat(body.pesoBruto),
          detalles: { create: parseDetalles(body.detalles) },
        },
      });
    });
    res.redirect(`/hojas-ruta/${id}`);
  } catch (err) {
    const hoja = await prisma.hojaRuta.findUnique({ where: { id }, include: includeCompleto });
    res.status(400).render('hojas-ruta/form', { title: `Editar Hoja de Ruta #${id}`, hoja, ...formData, error: err.message });
  }
});

module.exports = router;
