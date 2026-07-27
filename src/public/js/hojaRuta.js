(function () {
  const container = document.getElementById('detalles-container');
  const tplDetalle = document.getElementById('tpl-detalle');
  const tplRemito = document.getElementById('tpl-remito');
  if (!container || !tplDetalle || !tplRemito) return;

  const sucursales = window.__SUCURSALES__ || [];

  function reindex() {
    const blocks = container.querySelectorAll('.detalle-block');
    blocks.forEach((block, dIdx) => {
      block.querySelectorAll('[name^="detalles["]').forEach((el) => {
        el.name = el.name.replace(/detalles\[\d+\]/, `detalles[${dIdx}]`);
      });
      const numSpan = block.querySelector('.detalle-numero');
      if (numSpan) numSpan.textContent = String(dIdx + 1);
      const remitoRows = block.querySelectorAll('.remito-row');
      remitoRows.forEach((row, rIdx) => {
        row.querySelectorAll('[name*="[remitos]["]').forEach((el) => {
          el.name = el.name.replace(/remitos\]\[\d+\]/, `remitos][${rIdx}]`);
        });
      });
    });
  }

  function fillSucursales(selectEl, clienteId, selectedSucursalId) {
    selectEl.innerHTML = '<option value="">-- Seleccionar --</option>';
    sucursales
      .filter((s) => String(s.clienteId) === String(clienteId))
      .forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.nombre;
        if (selectedSucursalId && String(selectedSucursalId) === String(s.id)) opt.selected = true;
        selectEl.appendChild(opt);
      });
  }

  function toggleKm(block) {
    const transportistaSelect = document.getElementById('f-transportista');
    const opt = transportistaSelect ? transportistaSelect.selectedOptions[0] : null;
    const habilitado = !!opt && opt.dataset.km === 'true';
    block.querySelectorAll('.bloque-km').forEach((el) => {
      el.style.display = habilitado ? '' : 'none';
    });
  }

  function toggleKmAll() {
    container.querySelectorAll('.detalle-block').forEach(toggleKm);
  }

  function addRemito(block, data) {
    block.querySelector('.remitos-container').appendChild(tplRemito.content.cloneNode(true));
    const row = block.querySelector('.remitos-container').lastElementChild;
    if (data) {
      row.querySelector('[name*="[numeroRemito]"]').value = data.numeroRemito || '';
      row.querySelector('[name*="[kilosDespachados]"]').value = data.kilosDespachados != null ? data.kilosDespachados : '';
      row.querySelector('[name*="[palletsDespachados]"]').value = data.palletsDespachados != null ? data.palletsDespachados : '';
      row.querySelector('[name*="[cantidadIfco]"]').value = data.cantidadIfco != null ? data.cantidadIfco : 0;
      row.querySelector('[name*="[numeroRemitoIfco]"]').value = data.numeroRemitoIfco || '';
    }
    row.querySelector('.btn-remove-remito').addEventListener('click', () => {
      row.remove();
      reindex();
    });
    reindex();
  }

  function addDetalle(data) {
    container.appendChild(tplDetalle.content.cloneNode(true));
    const block = container.lastElementChild;

    const clienteSelect = block.querySelector('.f-cliente');
    const sucursalSelect = block.querySelector('.f-sucursal');

    clienteSelect.addEventListener('change', () => {
      fillSucursales(sucursalSelect, clienteSelect.value, null);
    });
    block.querySelector('.btn-remove-detalle').addEventListener('click', () => {
      block.remove();
      reindex();
    });
    block.querySelector('.btn-add-remito').addEventListener('click', () => addRemito(block, null));

    if (data) {
      clienteSelect.value = data.clienteId || '';
      fillSucursales(sucursalSelect, data.clienteId, data.sucursalId);
      block.querySelector('.f-domicilio').value = data.domicilioEntrega || '';
      block.querySelector('.f-orden').value = data.ordenPrioridad || 1;
      block.querySelector('[name$="[numeroTurno]"]').value = data.numeroTurno || '';
      block.querySelector('[name$="[horaTurno]"]').value = data.horaTurno || '';
      block.querySelector('[name$="[rangoHorarioDesde]"]').value = data.rangoHorarioDesde || '';
      block.querySelector('[name$="[rangoHorarioHasta]"]').value = data.rangoHorarioHasta || '';
      block.querySelector('[name$="[numeroOrdenCompra]"]').value = data.numeroOrdenCompra || '';
      block.querySelector('[name$="[kmInicio]"]').value = data.kmInicio != null ? data.kmInicio : '';
      block.querySelector('[name$="[horaInicioTramo]"]').value = data.horaInicioTramo || '';
      block.querySelector('[name$="[kmFin]"]').value = data.kmFin != null ? data.kmFin : '';
      block.querySelector('[name$="[horaFinTramo]"]').value = data.horaFinTramo || '';
      (data.remitos || []).forEach((r) => addRemito(block, r));
    } else {
      block.querySelector('.f-orden').value = container.children.length;
    }
    toggleKm(block);
    reindex();
  }

  document.getElementById('btn-add-detalle').addEventListener('click', () => addDetalle(null));
  const transportistaSelect = document.getElementById('f-transportista');
  if (transportistaSelect) transportistaSelect.addEventListener('change', toggleKmAll);

  const initial = window.__INITIAL_DETALLES__ || [];
  if (initial.length) {
    initial.forEach((d) => addDetalle(d));
  } else {
    addDetalle(null);
  }
  toggleKmAll();
})();
