const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const CATEGORIAS_CONDUCTOR = [
  { value: 'C', label: 'C' },
  { value: 'D1', label: 'D1' },
  { value: 'D2', label: 'D2' },
  { value: 'D3', label: 'D3' },
  { value: 'D4', label: 'D4' },
  { value: 'E', label: 'E' },
  { value: 'OTRA', label: 'Otra (detallar)' },
];

// Config declarativa de cada tabla maestra: modelo de Prisma, campos del formulario
// y de donde salen las opciones de los combos (select).
const CONFIG = {
  transportistas: {
    model: 'transportista',
    singular: 'Transportista',
    titulo: 'Transportes',
    listFields: ['razonSocial', 'cuit', 'localidad', 'provincia', 'controlKmHabilitado', 'activo'],
    fields: [
      { name: 'razonSocial', label: 'Razón Social', type: 'text', required: true },
      { name: 'controlKmHabilitado', label: 'Requiere control de Km y hora por tramo', type: 'checkbox' },
      { name: 'cuit', label: 'CUIT', type: 'text' },
      { name: 'domicilio', label: 'Domicilio', type: 'text' },
      { name: 'codigoPostal', label: 'Código Postal', type: 'text' },
      { name: 'localidad', label: 'Localidad', type: 'text' },
      { name: 'provincia', label: 'Provincia', type: 'text' },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
  },
  conductores: {
    model: 'conductor',
    singular: 'Conductor',
    titulo: 'Conductores',
    listFields: ['apellido', 'nombre', 'dni', 'transportistaId', 'condicion', 'activo'],
    fields: [
      { name: 'apellido', label: 'Apellido', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'dni', label: 'DNI', type: 'text', required: true },
      { name: 'transportistaId', label: 'Transporte', type: 'select', optionsKey: 'transportistas' },
      { name: 'empleador', label: 'Empleador', type: 'text' },
      {
        name: 'condicion',
        label: 'Condición',
        type: 'select',
        options: [
          { value: 'RELACION_DEPENDENCIA', label: 'Relación de dependencia' },
          { value: 'INDEPENDIENTE', label: 'Independiente' },
        ],
      },
      { name: 'fechaNacimiento', label: 'Fecha de nacimiento', type: 'date' },
      { name: 'seguroVidaObligatorio', label: 'Seguro de vida obligatorio', type: 'checkbox' },
      { name: 'seguroVidaCompania', label: 'Compañía (seguro de vida)', type: 'text' },
      { name: 'seguroAccidentesPersonales', label: 'Seguro de accidentes personales', type: 'checkbox' },
      { name: 'seguroAccidentesCompania', label: 'Compañía (accidentes personales)', type: 'text' },
      { name: 'registroConducirNumero', label: 'Número de registro de conducir', type: 'text' },
      { name: 'registroConducirVencimiento', label: 'Vencimiento de registro', type: 'date' },
      {
        name: 'categoriasHabilitantes',
        label: 'Categorías habilitantes',
        type: 'multicheckbox',
        options: CATEGORIAS_CONDUCTOR,
      },
      {
        name: 'categoriaOtraDetalle',
        label: 'Detalle de la categoría "Otra"',
        type: 'text',
        conditional: { type: 'includes', field: 'categoriasHabilitantes', value: 'OTRA' },
      },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
    postCoerce(data) {
      if (!data.categoriasHabilitantes || !data.categoriasHabilitantes.includes('OTRA')) {
        data.categoriaOtraDetalle = null;
      }
      return data;
    },
  },
  camiones: {
    model: 'camion',
    singular: 'Camión',
    titulo: 'Camiones',
    listFields: ['patente', 'transportistaId', 'marca', 'modelo', 'tipo', 'activo'],
    fields: [
      { name: 'patente', label: 'Patente (dominio)', type: 'text', required: true },
      { name: 'transportistaId', label: 'Transporte', type: 'select', optionsKey: 'transportistas' },
      { name: 'marca', label: 'Marca', type: 'text' },
      { name: 'modelo', label: 'Modelo', type: 'text' },
      { name: 'anio', label: 'Año', type: 'number' },
      { name: 'vencimientoVtv', label: 'Vencimiento VTV', type: 'date' },
      { name: 'companiaSeguro', label: 'Compañía de Seguro', type: 'text' },
      { name: 'numeroPoliza', label: 'Número de Póliza', type: 'text' },
      { name: 'vencimientoSeguro', label: 'Vencimiento Seguro', type: 'date' },
      {
        name: 'tipo',
        label: 'Tractor o Chasis',
        type: 'radio',
        options: [
          { value: 'TRACTOR', label: 'Tractor' },
          { value: 'CHASIS', label: 'Chasis' },
        ],
      },
      {
        name: 'capacidadPallets',
        label: 'Capacidad de pallets',
        type: 'number',
        conditional: { type: 'equals', field: 'tipo', value: 'CHASIS' },
      },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
    postCoerce(data) {
      if (data.tipo !== 'CHASIS') data.capacidadPallets = null;
      return data;
    },
  },
  acoplados: {
    model: 'acoplado',
    singular: 'Acoplado',
    titulo: 'Acoplados',
    listFields: ['patente', 'transportistaId', 'marca', 'modelo', 'capacidadPallets', 'activo'],
    fields: [
      { name: 'patente', label: 'Patente (dominio)', type: 'text', required: true },
      { name: 'transportistaId', label: 'Transporte', type: 'select', optionsKey: 'transportistas' },
      { name: 'marca', label: 'Marca', type: 'text' },
      { name: 'modelo', label: 'Modelo', type: 'text' },
      { name: 'anio', label: 'Año', type: 'number' },
      { name: 'vencimientoVtv', label: 'Vencimiento VTV', type: 'date' },
      { name: 'companiaSeguro', label: 'Compañía de Seguro', type: 'text' },
      { name: 'numeroPoliza', label: 'Número de Póliza', type: 'text' },
      { name: 'vencimientoSeguro', label: 'Vencimiento Seguro', type: 'date' },
      { name: 'capacidadPallets', label: 'Capacidad de pallets', type: 'number' },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
  },
  envases: {
    model: 'envase',
    singular: 'Envase',
    titulo: 'Envases',
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
  },
  clientes: {
    model: 'cliente',
    singular: 'Cliente',
    titulo: 'Clientes',
    fields: [
      { name: 'razonSocial', label: 'Razón Social', type: 'text', required: true },
      { name: 'cuit', label: 'CUIT', type: 'text' },
      { name: 'domicilio', label: 'Domicilio', type: 'text' },
      { name: 'codigoPostal', label: 'Código Postal', type: 'text' },
      { name: 'localidad', label: 'Localidad', type: 'text' },
      { name: 'provincia', label: 'Provincia', type: 'text' },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
  },
  sucursales: {
    model: 'sucursal',
    singular: 'Sucursal',
    titulo: 'Sucursales',
    listFields: ['clienteId', 'nombre', 'numeroSucursal', 'domicilio', 'localidad', 'activo'],
    fields: [
      { name: 'clienteId', label: 'Cliente', type: 'select', optionsKey: 'clientes', required: true },
      { name: 'nombre', label: 'Nombre de Sucursal', type: 'text', required: true },
      { name: 'denominacion', label: 'Denominación', type: 'text' },
      { name: 'numeroSucursal', label: 'Número de Sucursal', type: 'text' },
      { name: 'domicilio', label: 'Domicilio', type: 'text', required: true },
      { name: 'codigoPostal', label: 'Código Postal', type: 'text' },
      { name: 'localidad', label: 'Localidad', type: 'text' },
      { name: 'provincia', label: 'Provincia', type: 'text' },
      { name: 'contacto', label: 'Contacto', type: 'text' },
      { name: 'horario', label: 'Horario', type: 'text' },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
      { name: 'notas', label: 'Notas', type: 'textarea' },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
  },
  usuarios: {
    model: 'usuario',
    singular: 'Usuario',
    titulo: 'Usuarios del sistema',
    fields: [
      { name: 'username', label: 'Usuario', type: 'text', required: true },
      { name: 'password', label: 'Contraseña', type: 'password', required: 'create-only' },
      { name: 'nombre', label: 'Nombre y Apellido', type: 'text', required: true },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
  },
};

// Campo de cada modelo que se usa como texto visible en los combos (select)
const LABEL_FIELD = {
  transportistas: 'razonSocial',
  clientes: 'razonSocial',
};

// Para modelos donde el texto visible se arma con mas de un campo
const LABEL_FN = {
  conductores: (r) => `${r.apellido}, ${r.nombre} (DNI ${r.dni})`,
};

function getConfig(req, res, next) {
  const cfg = CONFIG[req.params.key];
  if (!cfg) return res.status(404).render('error', { title: 'No encontrado', mensaje: 'Tabla maestra inexistente.' });
  req.maestroKey = req.params.key;
  req.maestroConfig = cfg;
  next();
}

async function loadOptions(cfg) {
  const optionsMap = {};
  for (const field of cfg.fields) {
    if (field.type === 'select' && field.optionsKey) {
      const refCfg = CONFIG[field.optionsKey];
      const labelField = LABEL_FIELD[field.optionsKey] || 'nombre';
      const labelFn = LABEL_FN[field.optionsKey];
      const rows = await prisma[refCfg.model].findMany({ orderBy: labelFn ? { id: 'asc' } : { [labelField]: 'asc' } });
      optionsMap[field.name] = rows.map((r) => ({ value: r.id, label: labelFn ? labelFn(r) : r[labelField], activo: r.activo }));
    }
  }
  return optionsMap;
}

function toNullableDate(v) {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function coerceBody(cfg, body) {
  let data = {};
  for (const field of cfg.fields) {
    if (field.name === 'password') continue; // se maneja aparte (hash)
    let value = body[field.name];
    if (field.type === 'checkbox') {
      data[field.name] = value === 'on' || value === 'true';
    } else if (field.type === 'select' && field.optionsKey) {
      data[field.name] = value ? Number(value) : null;
    } else if (field.type === 'number') {
      data[field.name] = value === '' || value === undefined || value === null ? null : parseInt(value, 10);
    } else if (field.type === 'date') {
      data[field.name] = toNullableDate(value);
    } else if (field.type === 'multicheckbox') {
      data[field.name] = value ? (Array.isArray(value) ? value : [value]) : [];
    } else {
      data[field.name] = value === '' || value === undefined ? null : value;
    }
  }
  if (typeof cfg.postCoerce === 'function') {
    data = cfg.postCoerce(data) || data;
  }
  return data;
}

async function renderLista(req, res, cfg, error) {
  const items = await prisma[cfg.model].findMany({ orderBy: { id: 'desc' } });
  const optionsMap = await loadOptions(cfg);
  const displayFields = cfg.listFields
    ? cfg.fields.filter((f) => cfg.listFields.includes(f.name))
    : cfg.fields.filter((f) => f.name !== 'password');
  res.render('maestros/lista', {
    title: cfg.titulo,
    key: req.maestroKey,
    cfg,
    items,
    optionsMap,
    displayFields,
    error: error || null,
    puedeEscribir: true,
    puedeEliminar: true,
  });
}

router.get('/:key', getConfig, async (req, res) => {
  await renderLista(req, res, req.maestroConfig, null);
});

router.get('/:key/nuevo', getConfig, async (req, res) => {
  const cfg = req.maestroConfig;
  const optionsMap = await loadOptions(cfg);
  res.render('maestros/form', { title: `Nuevo ${cfg.singular}`, key: req.maestroKey, cfg, item: null, optionsMap, error: null });
});

router.get('/:key/:id', getConfig, async (req, res) => {
  const cfg = req.maestroConfig;
  const item = await prisma[cfg.model].findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.status(404).render('error', { title: 'No encontrado', mensaje: 'Registro inexistente.' });
  const optionsMap = await loadOptions(cfg);
  const displayFields = cfg.fields.filter((f) => f.name !== 'password');
  res.render('maestros/ver', {
    title: `${cfg.singular} #${item.id}`,
    key: req.maestroKey,
    cfg,
    item,
    optionsMap,
    displayFields,
    puedeEscribir: true,
  });
});

router.post('/:key', getConfig, async (req, res) => {
  const cfg = req.maestroConfig;
  try {
    const data = coerceBody(cfg, req.body);
    if (req.maestroKey === 'usuarios') {
      if (!req.body.password) throw new Error('La contraseña es obligatoria para un usuario nuevo.');
      data.passwordHash = await bcrypt.hash(req.body.password, 10);
    }
    await prisma[cfg.model].create({ data });
    res.redirect(`/maestros/${req.maestroKey}`);
  } catch (err) {
    const optionsMap = await loadOptions(cfg);
    res.status(400).render('maestros/form', {
      title: `Nuevo ${cfg.singular}`,
      key: req.maestroKey,
      cfg,
      item: req.body,
      optionsMap,
      error: err.code === 'P2002' ? 'Ya existe un registro con ese valor único (duplicado).' : err.message,
    });
  }
});

router.get('/:key/:id/editar', getConfig, async (req, res) => {
  const cfg = req.maestroConfig;
  const item = await prisma[cfg.model].findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.status(404).render('error', { title: 'No encontrado', mensaje: 'Registro inexistente.' });
  const optionsMap = await loadOptions(cfg);
  res.render('maestros/form', { title: `Editar ${cfg.singular}`, key: req.maestroKey, cfg, item, optionsMap, error: null });
});

router.post('/:key/:id', getConfig, async (req, res) => {
  const cfg = req.maestroConfig;
  const id = Number(req.params.id);
  try {
    const data = coerceBody(cfg, req.body);
    if (req.maestroKey === 'usuarios' && req.body.password) {
      data.passwordHash = await bcrypt.hash(req.body.password, 10);
    }
    await prisma[cfg.model].update({ where: { id }, data });
    res.redirect(`/maestros/${req.maestroKey}`);
  } catch (err) {
    const optionsMap = await loadOptions(cfg);
    res.status(400).render('maestros/form', {
      title: `Editar ${cfg.singular}`,
      key: req.maestroKey,
      cfg,
      item: { ...req.body, id },
      optionsMap,
      error: err.code === 'P2002' ? 'Ya existe un registro con ese valor único (duplicado).' : err.message,
    });
  }
});

router.post('/:key/:id/eliminar', getConfig, async (req, res) => {
  const cfg = req.maestroConfig;
  const id = Number(req.params.id);
  try {
    await prisma[cfg.model].delete({ where: { id } });
    res.redirect(`/maestros/${req.maestroKey}`);
  } catch (err) {
    const mensaje =
      err.code === 'P2003' || err.code === 'P2014'
        ? 'No se puede eliminar: este registro está siendo utilizado por otros datos (por ejemplo, hojas de ruta). Podés desactivarlo con la casilla "Activo" en su lugar.'
        : 'No se pudo eliminar el registro.';
    await renderLista(req, res, cfg, mensaje);
  }
});

module.exports = router;
