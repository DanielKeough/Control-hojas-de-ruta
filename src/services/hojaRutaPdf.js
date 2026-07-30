const PDFDocument = require('pdfkit');

const MARGIN = 40;
const TZ = 'America/Argentina/Buenos_Aires';

function pad6(n) {
  return String(n).padStart(6, '0');
}

function fmtFechaHora(date) {
  return new Date(date).toLocaleString('es-AR', { timeZone: TZ });
}

function labeledLine(doc, width, pairs) {
  const text = pairs.map(([label, value]) => `${label}: ${value || '-'}`).join(' · ');
  doc.x = MARGIN;
  doc.fontSize(9).font('Helvetica').text(text, { width });
  doc.moveDown(0.3);
}

function ensureSpace(doc, needed) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

function drawTableRow(doc, x, y, colWidths, values, opts = {}) {
  const rowHeight = 16;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  if (opts.header) {
    doc.rect(x, y, totalWidth, rowHeight).fill('#eeeeee');
    doc.fillColor('#000000');
  }
  doc.fontSize(8).font(opts.header ? 'Helvetica-Bold' : 'Helvetica');
  let cx = x;
  values.forEach((v, i) => {
    doc.text(String(v == null ? '-' : v), cx + 4, y + 4, { width: colWidths[i] - 8 });
    cx += colWidths[i];
  });
  doc.rect(x, y, totalWidth, rowHeight).stroke();
  let vx = x;
  colWidths.forEach((w) => {
    vx += w;
    doc.moveTo(vx, y).lineTo(vx, y + rowHeight).stroke();
  });
  return y + rowHeight;
}

function buildHojaRutaPdf(hoja, res) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="HR-${pad6(hoja.id)}.pdf"`);
  doc.pipe(res);

  const pageWidth = doc.page.width - MARGIN * 2;

  doc.font('Helvetica-Bold').fontSize(16).text('HOJA DE RUTA', MARGIN, MARGIN);
  doc.font('Helvetica').fontSize(11).fillColor('#555555').text(`HR-${pad6(hoja.id)}`, MARGIN, doc.y);
  doc.fillColor('#000000');
  doc.fontSize(8).text(
    `Fecha de impresión: ${fmtFechaHora(new Date())}\nEstado: ${hoja.estado}`,
    MARGIN,
    MARGIN,
    { width: pageWidth, align: 'right' },
  );
  doc.y = Math.max(doc.y, MARGIN + 40);
  doc.moveDown(0.5);

  labeledLine(doc, pageWidth, [
    ['Fecha y hora emisión', fmtFechaHora(hoja.fechaHoraEmision)],
    ['Transporte', hoja.transportista.razonSocial],
  ]);
  labeledLine(doc, pageWidth, [
    ['Patente camión', hoja.camion.patente],
    ['Patente acoplado', hoja.acoplado ? hoja.acoplado.patente : '-'],
  ]);
  labeledLine(doc, pageWidth, [
    ['Conductor', `${hoja.conductor.apellido}, ${hoja.conductor.nombre}`],
    ['DNI conductor', hoja.conductor.dni],
  ]);
  labeledLine(doc, pageWidth, [
    ['Ticket pesada balanza', hoja.ticketPesadaBalanza || '-'],
    ['Tara / Peso bruto', `${hoja.tara != null ? hoja.tara + ' kg' : '-'} / ${hoja.pesoBruto != null ? hoja.pesoBruto + ' kg' : '-'}`],
  ]);
  doc.moveDown(0.5);

  const colWidths = [70, 70, 165, 70, 90];
  const headers = ['Remito', 'Kilos', 'Envase', 'Cant.', 'IFCO'];

  hoja.detalles.forEach((d) => {
    ensureSpace(doc, 70);
    doc.moveDown(0.3);
    doc.x = MARGIN;
    doc.font('Helvetica-Bold').fontSize(10).text(
      `Destino #${d.ordenPrioridad} — ${d.cliente.razonSocial}${d.sucursal ? ' / ' + d.sucursal.nombre : ''}`,
      { width: pageWidth },
    );

    const detalleLinea = [['Domicilio de entrega', d.domicilioEntrega]];
    if (d.localidadEntrega) detalleLinea.push(['Localidad', d.localidadEntrega]);
    if (d.provinciaEntrega) detalleLinea.push(['Provincia', d.provinciaEntrega]);
    if (d.numeroTurno) detalleLinea.push(['Turno', d.numeroTurno]);
    if (d.horaTurno) detalleLinea.push(['Hora', d.horaTurno]);
    if (d.rangoHorarioDesde || d.rangoHorarioHasta) detalleLinea.push(['Rango', `${d.rangoHorarioDesde || ''} - ${d.rangoHorarioHasta || ''}`]);
    if (d.numeroOrdenCompra) detalleLinea.push(['OC', d.numeroOrdenCompra]);
    labeledLine(doc, pageWidth, detalleLinea);

    ensureSpace(doc, 16);
    let y = drawTableRow(doc, MARGIN, doc.y, colWidths, headers, { header: true });
    d.remitos.forEach((r) => {
      if (y + 16 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = MARGIN;
        y = drawTableRow(doc, MARGIN, y, colWidths, headers, { header: true });
      }
      y = drawTableRow(doc, MARGIN, y, colWidths, [
        r.numeroRemito,
        r.kilosDespachados,
        r.envase ? r.envase.nombre : '-',
        r.cantidadEnvases != null ? r.cantidadEnvases : '-',
        r.cantidadIfco,
      ]);
    });
    doc.y = y + 10;
    doc.x = MARGIN;
  });

  ensureSpace(doc, 60);
  doc.moveDown(1.5);
  const firmaWidth = pageWidth / 2;
  const firmaY = doc.y + 20;
  doc.moveTo(MARGIN, firmaY).lineTo(MARGIN + firmaWidth, firmaY).stroke();
  doc.fontSize(8).fillColor('#444444').text('Firma y aclaración — Conductor', MARGIN, firmaY + 4);

  doc.end();
}

module.exports = { buildHojaRutaPdf };
