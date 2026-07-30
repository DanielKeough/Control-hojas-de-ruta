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

module.exports = { attachUser, requireAuth, COOKIE_NAME, JWT_SECRET };
