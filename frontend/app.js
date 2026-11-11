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

const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

// Convierte una fecha ISO al formato de <input type="datetime-local">
function aInputLocal(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ============ Sesión (el token se borra al cerrar la pestaña) ============
const CLAVE_TOKEN = 'vet_token';
const CLAVE_USUARIO = 'vet_usuario';

const guardado = {
  leer: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  poner: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  borrar: (k) => { try { sessionStorage.removeItem(k); } catch { /* sin almacenamiento */ } },
};

function limpiarSesion() {
  guardado.borrar(CLAVE_TOKEN);
  guardado.borrar(CLAVE_USUARIO);
}

function mostrarLogin(aviso = '') {
  $('vista-app').classList.add('oculto');
  $('vista-login').classList.remove('oculto');
  $('login-error').textContent = aviso;
  $('login-clave').value = '';
  $('login-usuario').focus();
}

function mostrarApp() {
  $('vista-login').classList.add('oculto');
  $('vista-app').classList.remove('oculto');
  $('nombre-usuario').textContent = guardado.leer(CLAVE_USUARIO) || '';
  cambiarVista('inicio');
}

async function cerrarSesion() {
  try { await api('logout/', { method: 'POST' }); } catch { /* ya no importa */ }
  limpiarSesion();
  mostrarLogin();
}

$('form-login').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const boton = ev.submitter;
  boton.disabled = true;
  boton.textContent = 'Entrando… (puede tardar un minuto)';
  $('login-error').textContent = '';

  try {
    const resp = await fetch(`${API_URL}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: $('login-usuario').value.trim(),
        password: $('login-clave').value,
      }),
    });
    const datos = await resp.json().catch(() => null);

    if (!resp.ok) {
      $('login-error').textContent =
        resp.status === 400
          ? 'Usuario o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Inténtalo de nuevo.';
      return;
    }

    guardado.poner(CLAVE_TOKEN, datos.token);
    guardado.poner(CLAVE_USUARIO, datos.usuario);
    mostrarApp();
  } catch {
    $('login-error').textContent =
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  } finally {
    boton.disabled = false;
    boton.textContent = 'Entrar';
  }
});

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

const MENU = [
  ['inicio', '🏠', 'Inicio'],
  ['clientes', '👥', 'Clientes'],
  ['mascotas', '🐶', 'Mascotas'],
  ['citas', '📅', 'Citas'],
  ['consultas', '🩺', 'Consultas'],
];

const TARJETAS = [
  { clave: 'clientes', titulo: 'Clientes registrados', icono: '👥', color: 'c-azul', destino: 'clientes' },
  { clave: 'mascotas', titulo: 'Mascotas', icono: '🐶', color: 'c-morado', destino: 'mascotas' },
  { clave: 'citas_hoy', titulo: 'Citas de hoy', icono: '📅', color: 'c-naranja', destino: 'citas' },
  { clave: 'citas_pendientes', titulo: 'Citas pendientes', icono: '⏰', color: 'c-rojo', destino: 'citas' },
  { clave: 'consultas_mes', titulo: 'Consultas del mes', icono: '🩺', color: 'c-verde', destino: 'consultas' },
];

// ============ Estado de la aplicación ============
let recurso = 'clientes';
let filas = [];
let editandoId = null;
let agendaDatos = [];
let pestanaAgenda = 'hoy';
const cache = {}; // datos para llenar los <select>

// ============ Comunicación con la API ============
async function api(ruta, opciones = {}) {
  const token = guardado.leer(CLAVE_TOKEN);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Token ${token}`;

  const resp = await fetch(`${API_URL}/${ruta}`, { ...opciones, headers });

  if (resp.status === 401) {
    limpiarSesion();
    mostrarLogin('Tu sesión expiró. Inicia sesión de nuevo.');
    throw { estado: 401, datos: { detail: 'Tu sesión expiró.' } };
  }
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

// ============ Navegación ============
function cambiarVista(nombre) {
  $('lateral').classList.remove('abierto');
  document.querySelectorAll('#menu button').forEach((b) =>
    b.classList.toggle('activo', b.dataset.vista === nombre)
  );

  const esInicio = nombre === 'inicio';
  $('pantalla-inicio').classList.toggle('oculto', !esInicio);
  $('pantalla-lista').classList.toggle('oculto', esInicio);
  $('titulo-pagina').textContent = esInicio ? 'Inicio' : RECURSOS[nombre].titulo;

  if (esInicio) {
    cargarInicio();
  } else {
    recurso = nombre;
    $('buscar').value = '';
    cargar();
  }
}

// ============ Inicio: tarjetas y agenda ============
async function cargarInicio() {
  const contenedor = $('tarjetas');
  contenedor.replaceChildren(
    el('p', 'Cargando resumen… la primera vez puede tardar hasta un minuto.', 'estado')
  );

  try {
    const resumen = await api('resumen/');
    contenedor.replaceChildren();
    TARJETAS.forEach((t) => {
      const tarjeta = document.createElement('button');
      tarjeta.className = `tarjeta ${t.color}`;
      tarjeta.append(
        el('span', t.icono, 'tarjeta-icono'),
        el('strong', resumen[t.clave] ?? 0, 'tarjeta-num'),
        el('span', t.titulo, 'tarjeta-tit')
      );
      tarjeta.addEventListener('click', () => cambiarVista(t.destino));
      contenedor.append(tarjeta);
    });
  } catch (e) {
    contenedor.replaceChildren(el('p', textoError(e), 'estado error'));
  }

  try {
    agendaDatos = await api('citas/');
  } catch {
    agendaDatos = [];
  }
  dibujarAgenda();
}

function dibujarAgenda() {
  const lista = $('agenda-lista');
  lista.replaceChildren();
  document.querySelectorAll('#agenda-tabs button').forEach((b) =>
    b.classList.toggle('activo', b.dataset.pestana === pestanaAgenda)
  );

  const ahora = new Date();
  let citas = agendaDatos.filter((c) => c.estado === 'programada');

  if (pestanaAgenda === 'hoy') {
    citas = citas.filter((c) => new Date(c.fecha_hora).toDateString() === ahora.toDateString());
  } else {
    citas = citas.filter((c) => new Date(c.fecha_hora) > ahora).slice(0, 8);
  }

  if (!citas.length) {
    lista.append(
      el('p', pestanaAgenda === 'hoy'
        ? 'No hay citas programadas para hoy.'
        : 'No hay citas próximas.', 'estado')
    );
    return;
  }

  citas.forEach((c) => {
    const fila = el('div', '', 'agenda-item');
    const info = el('div');
    info.append(
      el('strong', c.mascota_nombre),
      el('div', c.motivo, 'suave'),
      el('div', pestanaAgenda === 'hoy' ? fmtHora(c.fecha_hora) : fmtFecha(c.fecha_hora), 'suave')
    );
    const boton = el('button', 'Atender', 'btn chico primario');
    boton.addEventListener('click', () => atender(c));
    fila.append(info, boton);
    lista.append(fila);
  });
}

// Abre una consulta nueva con los datos de la cita ya llenos
async function atender(cita) {
  cambiarVista('consultas');
  await abrirFormulario(null, {
    mascota: cita.mascota,
    cita: cita.id,
    motivo: cita.motivo,
  });
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
async function abrirFormulario(item = null, inicial = {}) {
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
    } else if (!item && inicial[c.name] != null) {
      input.value = String(inicial[c.name]);
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

    // Al guardar una consulta nueva ligada a una cita, la cita queda completada
    if (!editando && recurso === 'consultas' && datos.cita) {
      try {
        await api(`citas/${datos.cita}/`, {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'completada' }),
        });
      } catch { /* la consulta ya se guardó; no es crítico */ }
    }

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

  const lista = el('div', '', 'detalle-grid');
  cfg.campos.forEach((c) => {
    let valor = item[`${c.name}_nombre`] ?? item[c.name];
    if (c.type === 'datetime-local') valor = fmtFecha(valor);

    const caja = el('div', '', c.type === 'textarea' ? 'dato ancho-completo' : 'dato');
    caja.append(
      el('span', c.label, 'dato-etiqueta'),
      el('strong', valor === '' || valor == null ? '—' : valor, 'dato-valor')
    );
    lista.append(caja);
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

// ============ Arranque ============
function iniciar() {
  const menu = $('menu');
  MENU.forEach(([clave, icono, texto]) => {
    const boton = document.createElement('button');
    boton.dataset.vista = clave;
    boton.append(el('span', icono), el('span', texto));
    boton.addEventListener('click', () => cambiarVista(clave));
    menu.append(boton);
  });

  document.querySelectorAll('#agenda-tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      pestanaAgenda = b.dataset.pestana;
      dibujarAgenda();
    })
  );

  $('btn-menu').addEventListener('click', () => $('lateral').classList.toggle('abierto'));
  $('btn-salir').addEventListener('click', cerrarSesion);
  $('btn-nuevo').addEventListener('click', () => abrirFormulario());
  $('btn-cancelar').addEventListener('click', () => $('dialogo').close());
  $('btn-cerrar').addEventListener('click', () => $('detalle').close());
  $('buscar').addEventListener('input', dibujarTabla);

  if (guardado.leer(CLAVE_TOKEN)) mostrarApp();
  else mostrarLogin();
}

iniciar();