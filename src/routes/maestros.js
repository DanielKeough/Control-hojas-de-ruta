const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireRole('ADMINISTRACION'));

// Config declarativa de cada tabla maestra: modelo de Prisma, campos del formulario
// y de donde salen las opciones de los combos (select).
const CONFIG = {
  transportistas: {
    model: 'transportista',
    singular: 'Transportista',
    titulo: 'Transportes',
    fields: [
      { name: 'razonSocial', label: 'Razón Social', type: 'text', required: true },
      { name: 'controlKmHabilitado', label: 'Requiere control de Km y hora por tramo', type: 'checkbox' },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
  },
  conductores: {
    model: 'conductor',
    singular: 'Conductor',
    titulo: 'Conductores',
    fields: [
      { name: 'apellido', label: 'Apellido', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'dni', label: 'DNI', type: 'text', required: true },
      { name: 'transportistaId', label: 'Transporte', type: 'select', optionsKey: 'transportistas' },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
  },
  camiones: {
    model: 'camion',
    singular: 'Camión',
    titulo: 'Camiones',
    fields: [
      { name: 'patente', label: 'Patente (dominio)', type: 'text', required: true },
      { name: 'transportistaId', label: 'Transporte', type: 'select', optionsKey: 'transportistas' },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
  },
  acoplados: {
    model: 'acoplado',
    singular: 'Acoplado',
    titulo: 'Acoplados',
    fields: [
      { name: 'patente', label: 'Patente (dominio)', type: 'text', required: true },
      { name: 'transportistaId', label: 'Transporte', type: 'select', optionsKey: 'transportistas' },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
  },
  clientes: {
    model: 'cliente',
    singular: 'Cliente',
    titulo: 'Clientes',
    fields: [
      { name: 'razonSocial', label: 'Razón Social', type: 'text', required: true },
      { name: 'activo', label: 'Activo', type: 'checkbox', defaultChecked: true },
    ],
  },
  sucursales: {
    model: 'sucursal',
    singular: 'Sucursal',
    titulo: 'Sucursales',
    fields: [
      { name: 'clienteId', label: 'Cliente', type: 'select', optionsKey: 'clientes', required: true },
      { name: 'nombre', label: 'Nombre de Sucursal', type: 'text', required: true },
      { name: 'domicilio', label: 'Domicilio de entrega', type: 'text', required: true },
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
      {
        name: 'rol',
        label: 'Rol',
        type: 'select',
        options: [
          { value: 'LOGISTICA', label: 'Logística' },
          { value: 'PORTERIA', label: 'Portería' },
          { value: 'ADMINISTRACION', label: 'Administración' },
          { value: 'CONDUCTOR', label: 'Conductor' },
        ],
        required: true,
      },
      {
        name: 'conductorId',
        label: 'Conductor vinculado (solo si el rol es Conductor)',
        type: 'select',
        optionsKey: 'conductores',
        showOnlyIfFieldEquals: { field: 'rol', value: 'CONDUCTOR' },
      },
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

function coerceBody(cfg, body) {
  const data = {};
  for (const field of cfg.fields) {
    if (field.name === 'password') continue; // se maneja aparte (hash)
    let value = body[field.name];
    if (field.type === 'checkbox') {
      data[field.name] = value === 'on' || value === 'true';
    } else if (field.type === 'select' && field.optionsKey) {
      data[field.name] = value ? Number(value) : null;
    } else {
      data[field.name] = value === '' ? null : value;
    }
  }
  // El conductor vinculado solo tiene sentido si el rol del usuario es CONDUCTOR
  if ('conductorId' in data) {
    if (data.rol !== 'CONDUCTOR') {
      data.conductorId = null;
    } else if (!data.conductorId) {
      throw new Error('Elegí el conductor vinculado a este usuario (rol Conductor).');
    }
  }
  return data;
}

router.get('/:key', getConfig, async (req, res) => {
  const cfg = req.maestroConfig;
  const items = await prisma[cfg.model].findMany({ orderBy: { id: 'desc' } });
  const optionsMap = await loadOptions(cfg);
  res.render('maestros/lista', { title: cfg.titulo, key: req.maestroKey, cfg, items, optionsMap, LABEL_FIELD });
});

router.get('/:key/nuevo', getConfig, async (req, res) => {
  const cfg = req.maestroConfig;
  const optionsMap = await loadOptions(cfg);
  res.render('maestros/form', { title: `Nuevo ${cfg.singular}`, key: req.maestroKey, cfg, item: null, optionsMap, error: null });
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

module.exports = router;
