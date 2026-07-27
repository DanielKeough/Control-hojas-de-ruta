const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'token';

function attachUser(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  req.user = null;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      res.clearCookie(COOKIE_NAME);
    }
  }
  res.locals.user = req.user;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect('/login');
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).render('error', {
        title: 'Acceso denegado',
        mensaje: 'No tenes permisos para acceder a esta seccion.',
      });
    }
    next();
  };
}

module.exports = { attachUser, requireAuth, requireRole, COOKIE_NAME, JWT_SECRET };
