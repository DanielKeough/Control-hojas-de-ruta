# Hojas de Ruta — Sistema de gestión de despachos

Aplicación web para registrar, controlar y facturar las hojas de ruta de los camiones que
despachan mercadería a clientes. Pensada para 4 roles:

- **Logística**: crea y edita las hojas de ruta (encabezado + destinos + remitos).
- **Portería**: carga el ticket de pesada final, hace el control/cierre de cada remito (recepción, kilos, pallets, IFCOs) y valida los datos de kilometraje/hora que carga el Conductor.
- **Administración**: superusuario. Administra las tablas maestras, usuarios, e imputa las facturas del transporte a cada remito entregado.
- **Conductor**: solo para transportes con "control de Km habilitado" (ej. Monti Media). Desde el celular, carga la hora y el kilometraje de inicio/fin de cada tramo de sus viajes asignados. Una vez que Portería valida esos datos, quedan bloqueados y el conductor ya no puede modificarlos.

Cada usuario con rol Conductor debe estar vinculado a una ficha de la tabla maestra
**Conductores** (se configura en `Maestros > Usuarios`, eligiendo el conductor correspondiente
cuando el rol es "Conductor"). El seed crea un usuario de ejemplo `conductor` / `conductor123`
vinculado al conductor Juan Pérez (Monti Media).

## Arquitectura

- **Backend**: Node.js + Express
- **Base de datos**: PostgreSQL (recomendado: [Supabase](https://supabase.com), tier gratuito)
- **ORM**: Prisma
- **Vistas**: EJS + Bootstrap 5 (sin build step)
- **Autenticación**: usuario/contraseña propios, sesión vía JWT en cookie httpOnly
- **Hosting sugerido**: [Render.com](https://render.com) (free tier)

El código vive en esta carpeta de OneDrive (se sincroniza y se puede compartir/editar entre
varias personas), pero los **datos reales viven en la base Postgres en la nube**, no en un
archivo local. Esto evita que la sincronización de OneDrive corrompa la base de datos cuando
varias personas la usan al mismo tiempo.

## 1. Crear la base de datos gratis en Supabase

1. Entrar a https://supabase.com y crear una cuenta (gratis).
2. Crear un nuevo proyecto (elegí una región cercana, ej. South America).
3. Ir a **Project Settings > Database > Connection string** y copiar la cadena en modo
   **Session pooler** (o "URI"). Va a verse parecida a:
   `postgresql://postgres.xxxx:TU_PASSWORD@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`
4. Guardá esa contraseña, la vas a necesitar.

> Nota: el proyecto gratuito de Supabase se "pausa" automáticamente si no se usa durante 7 días
> seguidos. Se reactiva con un clic desde el dashboard de Supabase.

## 2. Configurar el proyecto localmente

1. Instalar [Node.js](https://nodejs.org) (LTS) si no lo tenés.
2. Copiar `.env.example` a `.env` y completar:
   - `DATABASE_URL`: la cadena de conexión de Supabase del paso anterior.
   - `JWT_SECRET`: cualquier texto largo y aleatorio.
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_NOMBRE`: credenciales del usuario administrador inicial.
3. Instalar dependencias:

```bash
npm install
```

4. Crear las tablas en la base de datos (esto genera la migración y la aplica):

```bash
npx prisma migrate dev --name init
```

5. Cargar datos iniciales (usuario administrador + usuarios de ejemplo + datos de prueba):

```bash
npm run seed
```

Esto crea:
- `admin` / la contraseña que hayas puesto en `.env` (rol Administración)
- `logistica` / `logistica123` (rol Logística)
- `porteria` / `porteria123` (rol Portería)
- Un transporte "Monti Media" (con control de km/hora habilitado), un cliente y sucursal de ejemplo.

**Importante**: cambiá estas contraseñas desde `Maestros > Usuarios` (con el usuario admin) apenas
entres, sobre todo antes de compartir la app.

6. Levantar el servidor:

```bash
npm start
```

7. Abrir http://localhost:3000 y probar con los usuarios de arriba.

## 3. Publicar gratis en internet (Render.com)

Para que cada usuario se conecte desde su navegador sin depender de tu PC, hay que subir el
código a un repositorio Git (GitHub, gratis) y conectarlo a Render.

1. Crear un repositorio en https://github.com/new y subir esta carpeta:

```bash
git init
git add .
git commit -m "Version inicial hojas de ruta"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/hoja-de-ruta-app.git
git push -u origin main
```

2. Entrar a https://render.com, crear cuenta gratis, y elegir **New > Web Service**.
3. Conectar el repositorio de GitHub recién creado.
4. Configurar:
   - **Build command**: `npm install && npx prisma migrate deploy`
   - **Start command**: `npm start`
   - **Plan**: Free
5. En la sección **Environment**, agregar las variables:
   - `DATABASE_URL` (la misma de Supabase)
   - `JWT_SECRET`
   - `NODE_ENV` = `production`
6. Deploy. Render te da una URL pública (ej. `https://hoja-de-ruta-app.onrender.com`) que es la
   que van a usar Logística, Portería y Administración desde sus navegadores.
7. Para cargar los datos iniciales en producción, corré una sola vez desde tu PC (con el mismo
   `DATABASE_URL` de Supabase en tu `.env` local):

```bash
npm run seed
```

> Nota: el plan free de Render "duerme" el servicio después de 15 minutos sin uso. El primer
> ingreso después de estar dormido tarda unos 30-60 segundos en responder mientras arranca; luego
> funciona con normalidad.

## Estructura del proyecto

```
prisma/schema.prisma      Modelo de datos (todas las tablas)
prisma/seed.js            Datos iniciales (usuarios, transporte de ejemplo, etc.)
src/server.js             Punto de entrada del servidor
src/db.js                 Cliente de Prisma
src/middleware/auth.js    Autenticación (JWT) y control de roles
src/routes/auth.js        Login / logout
src/routes/maestros.js    CRUD de tablas maestras (solo Administración)
src/routes/hojasRuta.js   Registro de hoja de ruta (Logística / Administración)
src/routes/control.js     Control y cierre (Portería / Administración)
src/routes/facturacion.js Imputación de factura (Administración)
src/views/                Vistas EJS
src/public/               CSS y JS del lado del cliente
```

## Tablas maestras incluidas

Transportes, Conductores, Camiones, Acoplados, Clientes, Sucursales y Usuarios. Se administran
desde el menú **Maestros** (solo visible para Administración). Ningún maestro se borra
físicamente: se desactiva con el checkbox "Activo" para no romper el historial de hojas de ruta
ya cargadas.

El campo **"Requiere control de Km y hora por tramo"** de un Transporte habilita, solo para ese
transporte, los campos de kilometraje y hora de inicio/fin de cada tramo en la hoja de ruta (el
caso mencionado de "Monti Media").

## Flujo de una hoja de ruta

1. **Logística** crea la hoja de ruta (`Nueva Hoja de Ruta`): encabezado + uno o varios destinos,
   cada uno con sus remitos, kilos, pallets e IFCOs. Estado: `ABIERTA`.
2. **Portería** la busca en `Control y Cierre`, completa el ticket de pesada balanza y, por cada
   remito, si se recepcionó total/parcial, kilos y pallets recibidos (diferenciando ARLOG de
   descartables) e IFCOs recibidos/rechazados. Al guardar, la hoja pasa a `CONTROLADA`.
3. **Administración** la busca en `Imputación Factura`, marca cada remito como entregado o
   rechazado, y a los entregados les imputa el número de factura del transporte. Cuando todos los
   remitos quedan imputados, la hoja pasa a `FACTURADA`.
