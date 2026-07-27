const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { COOKIE_NAME, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('login', { title: 'Ingresar', error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const usuario = await prisma.usuario.findUnique({ where: { username } });

  if (!usuario || !usuario.activo) {
    return res.status(401).render('login', { title: 'Ingresar', error: 'Usuario o contraseña incorrectos.' });
  }
  const passwordOk = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordOk) {
    return res.status(401).render('login', { title: 'Ingresar', error: 'Usuario o contraseña incorrectos.' });
  }

  const payload = {
    id: usuario.id,
    username: usuario.username,
    nombre: usuario.nombre,
    rol: usuario.rol,
    conductorId: usuario.conductorId,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
  });
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.redirect('/login');
});

module.exports = router;
