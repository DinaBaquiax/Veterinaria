// ============ Utilidades ============
const $ = (id) => document.getElementById(id);

function el(etiqueta, texto = '', clase = '') {
  const nodo = document.createElement(etiqueta);
  nodo.textContent = texto;
  if (clase) nodo.className = clase;
  return nodo;
}

const fmtFecha = (iso) =>
  iso ? new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// Convierte una fecha ISO al formato que usa <input type="datetime-local">
function aInputLocal(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ============ Configuración de cada sección ============
const RECURSOS = {
  clientes: {
    titulo: 'Clientes',
    singular: 'cliente',
    aviso: 'También se eliminarán sus mascotas, citas y consultas.',
    columnas: [
      ['nombre', 'Nombre'],
      ['apellido', 'Apellido'],
      ['telefono', 'Teléfono'],
      ['email', 'Correo'],
    ],
    campos: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'apellido', label: 'Apellido', type: 'text', required: true },
      { name: 'telefono', label: 'Teléfono', type: 'text', required: true },
      { name: 'email', label: 'Correo', type: 'email' },
      { name: 'direccion', label: 'Dirección', type: 'text' },
    ],
  },

  mascotas: {
    titulo: 'Mascotas',
    singular: 'mascota',
    aviso: 'También se eliminarán sus citas y consultas.',
    historial: true,
    columnas: [
      ['nombre', 'Nombre'],
      ['especie', 'Especie'],
      ['raza', 'Raza'],
      ['cliente_nombre', 'Cliente'],
    ],
    campos: [
      {
        name: 'cliente', label: 'Cliente', type: 'select', required: true,
        origen: 'clientes', etiqueta: (c) => `${c.nombre} ${c.apellido}`,
      },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      {
        name: 'especie', label: 'Especie', type: 'select', required: true,
        opciones: [['perro', 'Perro'], ['gato', 'Gato'], ['ave', 'Ave'], ['otro', 'Otro']],
      },
      { name: 'raza', label: 'Raza', type: 'text' },
      {
        name: 'sexo', label: 'Sexo', type: 'select', required: true,
        opciones: [['macho', 'Macho'], ['hembra', 'Hembra']],
      },
      { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
    ],
  },

  citas: {
    titulo: 'Citas',
    singular: 'cita',
    columnas: [
      ['mascota_nombre', 'Mascota'],
      ['fecha_hora', 'Fecha y hora', fmtFecha],
      ['motivo', 'Motivo'],
      ['estado', 'Estado'],
    ],
    campos: [
      {
        name: 'mascota', label: 'Mascota', type: 'select', required: true,
        origen: 'mascotas', etiqueta: (m) => `${m.nombre} (${m.cliente_nombre})`,
      },
      { name: 'fecha_hora', label: 'Fecha y hora', type: 'datetime-local', required: true },
      { name: 'motivo', label: 'Motivo', type: 'text', required: true },
      {
        name: 'estado', label: 'Estado', type: 'select', required: true,
        opciones: [['programada', 'Programada'], ['completada', 'Completada'], ['cancelada', 'Cancelada']],
      },
    ],
  },

  consultas: {
    titulo: 'Consultas',
    singular: 'consulta',
    columnas: [
      ['mascota_nombre', 'Mascota'],
      ['fecha', 'Fecha', fmtFecha],
      ['motivo', 'Motivo'],
      ['diagnostico', 'Diagnóstico', null, 'largo'],
    ],
    campos: [
      {
        name: 'mascota', label: 'Mascota', type: 'select', required: true,
        origen: 'mascotas', etiqueta: (m) => `${m.nombre} (${m.cliente_nombre})`,
      },
      {
        name: 'cita', label: 'Cita (opcional)', type: 'select', opcional: true,
        origen: 'citas', etiqueta: (c) => `${c.mascota_nombre} · ${fmtFecha(c.fecha_hora)}`,
      },
      { name: 'motivo', label: 'Motivo', type: 'text', required: true },
      { name: 'diagnostico', label: 'Diagnóstico', type: 'textarea', required: true },
      { name: 'tratamiento', label: 'Tratamiento', type: 'textarea', required: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
    ],
  },
};

// ============ Estado de la aplicación ============
let recurso = 'clientes';
let filas = [];
let editandoId = null;
const cache = {}; // datos para llenar los <select>

// ============ Comunicación con la API ============
async function api(ruta, opciones = {}) {
  const resp = await fetch(`${API_URL}/${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });
  if (resp.status === 204) return null;
  const datos = await resp.json().catch(() => null);
  if (!resp.ok) throw { estado: resp.status, datos };
  return datos;
}

function textoError(e) {
  if (e && e.datos && typeof e.datos === 'object') {
    return Object.entries(e.datos)
      .map(([campo, msgs]) => {
        const lista = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
        return campo === 'non_field_errors' || campo === 'detail' ? lista : `${campo}: ${lista}`;
      })
      .join(' | ');
  }
  return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
}

// ============ Mensajes ============
let temporizador;
function mostrarMensaje(texto, tipo = 'ok') {
  const caja = $('mensaje');
  caja.textContent = texto;
  caja.className = `mensaje ${tipo}`;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => caja.classList.add('oculto'), 5000);
}

function mostrarEstado(texto, esError = false) {
  const caja = $('estado');
  caja.textContent = texto;
  caja.className = esError ? 'estado error' : 'estado';
}

// ============ Lista y tabla ============
async function cargar() {
  mostrarEstado('Cargando datos… la primera vez puede tardar hasta un minuto mientras despierta el servidor.');
  try {
    filas = await api(`${recurso}/`);
    dibujarTabla();
  } catch (e) {
    filas = [];
    dibujarTabla();
    mostrarEstado(textoError(e), true);
  }
}

function dibujarTabla() {
  const cfg = RECURSOS[recurso];
  const q = $('buscar').value.trim().toLowerCase();
  const visibles = filas.filter(
    (f) => !q || Object.values(f).join(' ').toLowerCase().includes(q)
  );

  const thead = document.querySelector('#tabla thead');
  const tbody = document.querySelector('#tabla tbody');
  thead.replaceChildren();
  tbody.replaceChildren();

  const encabezado = document.createElement('tr');
  cfg.columnas.forEach(([, nombre]) => encabezado.append(el('th', nombre)));
  encabezado.append(el('th', 'Acciones'));
  thead.append(encabezado);

  mostrarEstado(visibles.length ? '' : 'No hay registros para mostrar.');

  visibles.forEach((fila) => {
    const tr = document.createElement('tr');
    cfg.columnas.forEach(([clave, , formato, clase]) => {
      const valor = formato ? formato(fila[clave]) : fila[clave];
      tr.append(el('td', valor === '' || valor == null ? '—' : valor, clase || ''));
    });

    const acciones = el('td', '', 'col-acciones');
    const botones = [
      ['Ver', 'btn chico', () => verDetalle(fila)],
      ['Editar', 'btn chico', () => abrirFormulario(fila)],
      ['Eliminar', 'btn chico peligro', () => eliminar(fila)],
    ];
    botones.forEach(([texto, clase, accion]) => {
      const b = el('button', texto, clase);
      b.addEventListener('click', accion);
      acciones.append(b);
    });
    tr.append(acciones);
    tbody.append(tr);
  });
}

// ============ Formulario (crear / editar) ============
async function abrirFormulario(item = null) {
  const cfg = RECURSOS[recurso];
  editandoId = item ? item.id : null;
  $('form-titulo').textContent = `${item ? 'Editar' : 'Nuevo'} ${cfg.singular}`;
  $('form-error').textContent = '';

  try {
    for (const c of cfg.campos) {
      if (c.origen) cache[c.origen] = await api(`${c.origen}/`);
    }
  } catch (e) {
    mostrarMensaje(textoError(e), 'error');
    return;
  }

  const contenedor = $('campos');
  contenedor.replaceChildren();

  for (const c of cfg.campos) {
    const etiqueta = el('label', c.label + (c.required ? ' *' : ''));
    let input;

    if (c.type === 'select') {
      input = document.createElement('select');
      input.append(new Option(c.opcional ? '— Ninguna —' : '— Selecciona —', ''));
      const opciones = c.opciones || cache[c.origen].map((o) => [o.id, c.etiqueta(o)]);
      opciones.forEach(([valor, texto]) => input.append(new Option(texto, valor)));
    } else if (c.type === 'textarea') {
      input = document.createElement('textarea');
    } else {
      input = document.createElement('input');
      input.type = c.type;
    }

    input.id = `f-${c.name}`;
    if (c.required) input.required = true;

    if (item && item[c.name] != null) {
      input.value = c.type === 'datetime-local' ? aInputLocal(item[c.name]) : item[c.name];
    }

    etiqueta.append(input);
    contenedor.append(etiqueta);
  }

  // Aviso si falta registrar datos previos (por ejemplo, no hay clientes)
  const faltante = cfg.campos.find((c) => c.origen && c.required && !cache[c.origen].length);
  if (faltante) {
    $('form-error').textContent =
      `Primero debes registrar al menos un registro en: ${RECURSOS[faltante.origen].titulo}.`;
  }

  $('dialogo').showModal();
}

$('formulario').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const cfg = RECURSOS[recurso];
  const datos = {};

  for (const c of cfg.campos) {
    let valor = $(`f-${c.name}`).value;
    if (c.type === 'select' || c.type === 'date') valor = valor === '' ? null : valor;
    if (c.type === 'datetime-local' && valor) valor = new Date(valor).toISOString();
    datos[c.name] = valor;
  }

  const boton = ev.submitter;
  boton.disabled = true;
  $('form-error').textContent = '';

  try {
    const editando = editandoId !== null;
    await api(editando ? `${recurso}/${editandoId}/` : `${recurso}/`, {
      method: editando ? 'PUT' : 'POST',
      body: JSON.stringify(datos),
    });
    $('dialogo').close();
    mostrarMensaje(editando ? 'Registro actualizado correctamente.' : 'Registro creado correctamente.');
    await cargar();
  } catch (e) {
    $('form-error').textContent = textoError(e);
  } finally {
    boton.disabled = false;
  }
});

// ============ Eliminar ============
async function eliminar(item) {
  const cfg = RECURSOS[recurso];
  const aviso = cfg.aviso ? `\n${cfg.aviso}` : '';
  if (!confirm(`¿Eliminar este ${cfg.singular}? Esta acción no se puede deshacer.${aviso}`)) return;

  try {
    await api(`${recurso}/${item.id}/`, { method: 'DELETE' });
    mostrarMensaje('Registro eliminado correctamente.');
    await cargar();
  } catch (e) {
    mostrarMensaje(textoError(e), 'error');
  }
}

// ============ Detalle (y historial clínico) ============
async function verDetalle(item) {
  const cfg = RECURSOS[recurso];
  const cont = $('detalle-contenido');
  cont.replaceChildren(el('h3', `Detalle de ${cfg.singular}`));

  const lista = document.createElement('dl');
  cfg.campos.forEach((c) => {
    let valor = item[`${c.name}_nombre`] ?? item[c.name];
    if (c.type === 'datetime-local') valor = fmtFecha(valor);
    lista.append(el('dt', c.label), el('dd', valor === '' || valor == null ? '—' : valor));
  });
  cont.append(lista);
  $('detalle').showModal();

  if (cfg.historial) {
    cont.append(el('h4', 'Historial clínico'));
    const caja = el('p', 'Cargando historial…');
    cont.append(caja);
    try {
      const consultas = await api(`mascotas/${item.id}/historial/`);
      caja.remove();
      if (!consultas.length) {
        cont.append(el('p', 'Esta mascota aún no tiene consultas registradas.'));
      }
      consultas.forEach((c) => {
        const tarjeta = el('div', '', 'consulta');
        tarjeta.append(
          el('strong', `${fmtFecha(c.fecha)} · ${c.motivo}`),
          el('p', `Diagnóstico: ${c.diagnostico}`),
          el('p', `Tratamiento: ${c.tratamiento}`)
        );
        cont.append(tarjeta);
      });
    } catch (e) {
      caja.textContent = 'No se pudo cargar el historial.';
    }
  }
}

// ============ Navegación ============
function cambiarRecurso(nombre) {
  recurso = nombre;
  $('buscar').value = '';
  $('titulo').textContent = RECURSOS[nombre].titulo;
  document.querySelectorAll('#tabs button').forEach((b) =>
    b.classList.toggle('activo', b.dataset.recurso === nombre)
  );
  cargar();
}

function iniciar() {
  const nav = $('tabs');
  for (const [clave, cfg] of Object.entries(RECURSOS)) {
    const boton = el('button', cfg.titulo);
    boton.dataset.recurso = clave;
    boton.addEventListener('click', () => cambiarRecurso(clave));
    nav.append(boton);
  }
  $('btn-nuevo').addEventListener('click', () => abrirFormulario());
  $('btn-cancelar').addEventListener('click', () => $('dialogo').close());
  $('btn-cerrar').addEventListener('click', () => $('detalle').close());
  $('buscar').addEventListener('input', dibujarTabla);
  cambiarRecurso('clientes');
}

iniciar();
