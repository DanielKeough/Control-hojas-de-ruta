require('dotenv').config();
const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');

const { attachUser, requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const maestrosRoutes = require('./routes/maestros');
const hojasRutaRoutes = require('./routes/hojasRuta');
const controlRoutes = require('./routes/control');
const facturacionRoutes = require('./routes/facturacion');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(attachUser);

app.use('/', authRoutes);

app.get('/', requireAuth, (req, res) => {
  res.render('dashboard', { title: 'Inicio' });
});

app.use('/maestros', maestrosRoutes);
app.use('/hojas-ruta', hojasRutaRoutes);
app.use('/control', controlRoutes);
app.use('/facturacion', facturacionRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'No encontrado', mensaje: 'La página solicitada no existe.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error', mensaje: 'Ocurrió un error inesperado. Intentá de nuevo.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Hojas de Ruta corriendo en el puerto ${PORT}`);
});
