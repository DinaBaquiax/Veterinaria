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

// Cuadro con etiqueta y valor (se usa en el detalle y en los reportes)
function cajaDato(etiqueta, valor, clase = 'dato') {
  const caja = el('div', '', clase);
  caja.append(el('span', etiqueta, 'dato-etiqueta'), el('strong', valor, 'dato-valor'));
  return caja;
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

// ============ Servicios (opciones del "Motivo de consulta") ============
const SERVICIOS = [
  'Consultas',
  'Vacunas',
  'Desparasitantes',
  'Profilaxis dental',
  'Esterilizaciones',
  'Otro',
];
const OPCIONES_SERVICIO = SERVICIOS.map((s) => [s, s]);

// ============ Configuración de cada sección ============
const RECURSOS = {
  clientes: {
    titulo: 'Clientes',
    singular: 'cliente',
    reporte: true, // muestra el botón "Reporte" en cada fila
    aviso: 'También se eliminarán sus mascotas, citas y consultas.',
    columnas: [
      ['codigo', 'Código'],
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
    femenino: true,
    reporte: true,
    aviso: 'También se eliminarán sus citas y consultas.',
    historial: true,
    columnas: [
      ['codigo', 'Código'],
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
      { name: 'nombre', label: 'Nombre de la mascota', type: 'text', required: true },
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
    femenino: true,
    tituloNuevo: 'Haz una cita',
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
      {
        name: 'motivo', label: 'Motivo de consulta', type: 'select', required: true,
        opciones: OPCIONES_SERVICIO,
      },
      { name: 'fecha_hora', label: 'Fecha de la cita', type: 'datetime-local', required: true },
      {
        name: 'estado', label: 'Estado', type: 'select', required: true,
        opciones: [['programada', 'Programada'], ['completada', 'Completada'], ['cancelada', 'Cancelada']],
      },
    ],
  },

  consultas: {
    titulo: 'Consultas',
    singular: 'consulta',
    femenino: true,
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
      {
        name: 'motivo', label: 'Motivo de consulta', type: 'select', required: true,
        opciones: OPCIONES_SERVICIO,
      },
      { name: 'diagnostico', label: 'Diagnóstico', type: 'textarea', required: true },
      { name: 'tratamiento', label: 'Tratamiento', type: 'textarea', required: true },
      { name: 'observaciones', label: 'Comentario adicional', type: 'textarea' },
    ],
  },
};

// Opciones principales del menú
const MENU = [
  ['inicio', '🏠', 'Inicio'],
  ['clientes', '👥', 'Clientes'],
  ['mascotas', '🐶', 'Mascotas'],
  ['citas', '📅', 'Citas'],
  ['consultas', '🩺', 'Consultas'],
];

// Servicios, debajo de Consultas: cada uno abre una lista con las citas de ese servicio
const MENU_SERVICIOS = [
  ['Vacunas', '💉'],
  ['Desparasitantes', '💊'],
  ['Profilaxis dental', '🦷'],
  ['Esterilizaciones', '✂️'],
];

const TARJETAS = [
  { clave: 'clientes', titulo: 'Clientes registrados', icono: '👥', color: 'c-azul', destino: 'clientes' },
  { clave: 'mascotas', titulo: 'Mascotas', icono: '🐶', color: 'c-morado', destino: 'mascotas' },
  { clave: 'citas_hoy', titulo: 'Citas de hoy', icono: '📅', color: 'c-naranja', destino: 'citas' },
  { clave: 'citas_pendientes', titulo: 'Citas pendientes', icono: '⏰', color: 'c-rojo', destino: 'citas' },
  { clave: 'consultas_mes', titulo: 'Consultas del mes', icono: '🩺', color: 'c-verde', destino: 'consultas' },
];

const ESTADOS_CITA = { programada: 'Programada', completada: 'Completada', cancelada: 'Cancelada' };

// ============ Estado de la aplicación ============
let recurso = 'clientes';
let servicioActivo = null; // si tiene valor, la lista de citas se filtra por ese servicio
let filas = [];
let editandoId = null;
let agendaDatos = [];
let pestanaAgenda = 'hoy';
const cache = {}; // datos para llenar los <select>

// Paginación y buscador de las listas
let pagina = 1;
let porPagina = 10;
let esperaBusqueda;

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
// "servicio" es opcional: muestra las citas de ese servicio (Vacunas, Desparasitantes...)
function cambiarVista(nombre, servicio = null) {
  $('lateral').classList.remove('abierto');
  servicioActivo = servicio;

  const clave = servicio ? `servicio:${servicio}` : nombre;
  document.querySelectorAll('#menu button').forEach((b) =>
    b.classList.toggle('activo', b.dataset.vista === clave)
  );

  const esInicio = nombre === 'inicio';
  const esReportes = nombre === 'reportes';
  $('pantalla-inicio').classList.toggle('oculto', !esInicio);
  $('pantalla-lista').classList.toggle('oculto', esInicio || esReportes);
  $('pantalla-reportes').classList.toggle('oculto', !esReportes);
  $('titulo-pagina').textContent = esInicio
    ? 'Inicio'
    : esReportes
      ? 'Reportes'
      : servicio || RECURSOS[nombre].titulo;

  if (esInicio) {
    cargarInicio();
  } else if (esReportes) {
    prepararReportes();
  } else {
    recurso = nombre;
    pagina = 1;
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

// ============ Paginación (se usa en las listas y en los reportes) ============
// Devuelve los números de página que se muestran, con "…" cuando hay muchas
function numerosDePagina(actual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const base = [1, total, actual - 1, actual, actual + 1].filter((n) => n >= 1 && n <= total);
  const lista = [...new Set(base)].sort((a, b) => a - b);

  const salida = [];
  lista.forEach((n, i) => {
    if (i > 0 && n - lista[i - 1] > 1) salida.push('…');
    salida.push(n);
  });
  return salida;
}

// Dibuja los botones de paginación dentro de "caja".
// cambiar({ pagina, porPagina }) se ejecuta cuando la persona cambia de página o de cantidad.
function dibujarPaginacion(caja, { total, pagina, porPagina, cambiar }) {
  caja.replaceChildren();
  if (!total) return;

  const paginas = Math.ceil(total / porPagina);
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  caja.append(el('span', `Mostrando ${desde}–${hasta} de ${total}`, 'pag-info'));

  const controles = el('div', '', 'pag-controles');

  const boton = (texto, destino, activo = false, deshabilitado = false) => {
    const b = el('button', texto, activo ? 'pag-btn activo' : 'pag-btn');
    b.type = 'button';
    b.disabled = deshabilitado;
    b.addEventListener('click', () => cambiar({ pagina: destino, porPagina }));
    return b;
  };

  controles.append(boton('‹ Anterior', pagina - 1, false, pagina === 1));
  numerosDePagina(pagina, paginas).forEach((n) => {
    if (n === '…') controles.append(el('span', '…', 'pag-puntos'));
    else controles.append(boton(String(n), n, n === pagina));
  });
  controles.append(boton('Siguiente ›', pagina + 1, false, pagina === paginas));

  const selector = document.createElement('select');
  selector.className = 'pag-tamano';
  [5, 10, 25, 50].forEach((n) => selector.append(new Option(`${n} por página`, n)));
  selector.value = String(porPagina);
  selector.addEventListener('change', () =>
    cambiar({ pagina: 1, porPagina: Number(selector.value) })
  );
  controles.append(selector);

  caja.append(controles);
}

// ============ Lista y tabla ============
async function cargar() {
  mostrarEstado('Cargando datos… la primera vez puede tardar hasta un minuto mientras despierta el servidor.');
  try {
    filas = await api(`${recurso}/`);
    if (servicioActivo) filas = filas.filter((f) => f.motivo === servicioActivo);
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

  // Paginación: se muestran solo los registros de la página actual
  const paginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  if (pagina > paginas) pagina = paginas;
  const enPagina = visibles.slice((pagina - 1) * porPagina, pagina * porPagina);

  const thead = document.querySelector('#tabla thead');
  const tbody = document.querySelector('#tabla tbody');
  thead.replaceChildren();
  tbody.replaceChildren();

  const encabezado = document.createElement('tr');
  cfg.columnas.forEach(([, nombre]) => encabezado.append(el('th', nombre)));
  encabezado.append(el('th', 'Acciones'));
  thead.append(encabezado);

  // Mensaje de estado (buscador reactivo: indica cuántos resultados hay)
  const sinDatos = servicioActivo
    ? `No hay citas de ${servicioActivo} para mostrar.`
    : 'No hay registros para mostrar.';
  let mensaje = '';
  if (!visibles.length) mensaje = sinDatos;
  else if (q) mensaje = `${visibles.length} resultado${visibles.length === 1 ? '' : 's'} para «${q}»`;
  mostrarEstado(mensaje);

  enPagina.forEach((fila) => {
    const tr = document.createElement('tr');
    cfg.columnas.forEach(([clave, , formato, clase]) => {
      const valor = formato ? formato(fila[clave]) : fila[clave];
      tr.append(el('td', valor === '' || valor == null ? '—' : valor, clase || ''));
    });

    const acciones = el('td', '', 'col-acciones');
    const botones = [
      ['Ver', 'btn chico', () => verDetalle(fila)],
      ...(cfg.reporte ? [['Reporte', 'btn chico', () => verReporte(fila)]] : []),
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

  dibujarPaginacion($('paginacion'), {
    total: visibles.length,
    pagina,
    porPagina,
    cambiar: (nuevo) => {
      pagina = nuevo.pagina;
      porPagina = nuevo.porPagina;
      dibujarTabla();
    },
  });
}

// ============ Formulario emergente (crear / editar) ============
async function abrirFormulario(item = null, inicial = {}) {
  const cfg = RECURSOS[recurso];
  editandoId = item ? item.id : null;
  $('form-titulo').textContent = item
    ? `Editar ${cfg.singular}`
    : cfg.tituloNuevo || `${cfg.femenino ? 'Nueva' : 'Nuevo'} ${cfg.singular}`;
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
    const etiqueta = el('label', c.label);
    if (c.required) etiqueta.append(el('span', ' *', 'req'));
    let input;

    // Valor inicial: el del registro que se edita o el que viene de "Atender" / de un servicio
    let valorInicial = null;
    if (item && item[c.name] != null) valorInicial = item[c.name];
    else if (!item && inicial[c.name] != null) valorInicial = inicial[c.name];

    if (c.type === 'select') {
      input = document.createElement('select');
      input.append(new Option(c.opcional ? '— Ninguna —' : '— Selecciona —', ''));
      const opciones = c.opciones || cache[c.origen].map((o) => [o.id, c.etiqueta(o)]);
      opciones.forEach(([valor, texto]) => input.append(new Option(texto, valor)));
      // Si el valor guardado no está en la lista (por ejemplo, un motivo escrito antes a mano), se agrega
      if (c.opciones && valorInicial != null &&
          !opciones.some(([v]) => String(v) === String(valorInicial))) {
        input.append(new Option(valorInicial, valorInicial));
      }
    } else if (c.type === 'textarea') {
      input = document.createElement('textarea');
    } else {
      input = document.createElement('input');
      input.type = c.type;
    }

    input.id = `f-${c.name}`;
    if (c.required) input.required = true;

    if (valorInicial != null) {
      input.value = c.type === 'datetime-local' ? aInputLocal(valorInicial) : String(valorInicial);
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
  if (item.codigo) lista.append(cajaDato('Código', item.codigo));

  cfg.campos.forEach((c) => {
    let valor = item[`${c.name}_nombre`] ?? item[c.name];
    if (c.type === 'datetime-local') valor = fmtFecha(valor);

    lista.append(
      cajaDato(
        c.label,
        valor === '' || valor == null ? '—' : valor,
        c.type === 'textarea' ? 'dato ancho-completo' : 'dato'
      )
    );
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

// ============ Reporte de un cliente o una mascota ============
// Arma la ficha de una mascota: última visita, próxima cita e historial (consultas y citas)
function armarFicha(mascota, citas, consultas) {
  const ahora = new Date();
  const susCitas = citas.filter((c) => c.mascota === mascota.id);
  const susConsultas = consultas.filter((c) => c.mascota === mascota.id);

  // Última visita: la consulta o la cita completada más reciente
  const visitas = [
    ...susConsultas.map((c) => new Date(c.fecha)),
    ...susCitas.filter((c) => c.estado === 'completada').map((c) => new Date(c.fecha_hora)),
  ];
  const ultima = visitas.length ? new Date(Math.max(...visitas)) : null;

  // Próxima cita: la programada más cercana que todavía no pasó
  const proxima =
    susCitas
      .filter((c) => c.estado === 'programada' && new Date(c.fecha_hora) >= ahora)
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))[0] || null;

  // Historial: consultas y citas, de la más reciente a la más antigua.
  // Si una cita ya tiene su consulta, solo se muestra la consulta.
  const citasConConsulta = new Set(susConsultas.map((c) => c.cita).filter(Boolean));
  const historial = [
    ...susConsultas.map((c) => ({ tipo: 'Consulta', fecha: c.fecha, motivo: c.motivo, consulta: c })),
    ...susCitas
      .filter((c) => !citasConConsulta.has(c.id))
      .map((c) => ({ tipo: 'Cita', fecha: c.fecha_hora, motivo: c.motivo, estado: c.estado })),
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return { mascota, ultima, proxima, historial };
}

// Muestra el reporte (ventana) del cliente o de la mascota de la fila
async function verReporte(item) {
  const esCliente = recurso === 'clientes';
  const nombre = esCliente ? `${item.nombre} ${item.apellido}` : item.nombre;
  const cont = $('detalle-contenido');

  cont.replaceChildren(el('h3', `Reporte de ${nombre}`), el('p', 'Cargando reporte…', 'estado'));
  $('detalle').showModal();

  let fichas;
  try {
    const [mascotas, citas, consultas] = await Promise.all([
      api('mascotas/'),
      api('citas/'),
      api('consultas/'),
    ]);
    const suyas = esCliente ? mascotas.filter((m) => m.cliente === item.id) : [item];
    fichas = suyas.map((m) => armarFicha(m, citas, consultas));
  } catch (e) {
    if (e && e.estado === 401) {
      $('detalle').close();
      return;
    }
    cont.replaceChildren(
      el('h3', `Reporte de ${nombre}`),
      el('p', 'No se pudo cargar el reporte.', 'estado error')
    );
    return;
  }

  const titulo = el('h3', `Reporte de ${nombre}`);
  if (item.codigo) titulo.append(el('span', item.codigo, 'codigo'));

  const pdf = el('button', 'Descargar PDF', 'btn primario');
  pdf.addEventListener('click', () =>
    descargarPDF({ nombre, codigo: item.codigo, fichas })
  );
  const barra = el('div', '', 'ficha-acciones');
  barra.append(pdf);

  cont.replaceChildren(titulo, barra);

  if (esCliente) {
    cont.append(el('p', `Mascotas registradas: ${fichas.length}`, 'suave'));
    if (!fichas.length) {
      cont.append(el('p', 'Este cliente aún no tiene mascotas registradas.', 'estado'));
    }
  }

  fichas.forEach((f) => {
    const m = f.mascota;
    const seccion = el('section', '', 'ficha');

    const enc = el('h4', m.nombre);
    if (m.codigo) enc.append(el('span', m.codigo, 'codigo'));
    seccion.append(enc);
    seccion.append(
      el('p', [m.especie, m.raza, `Cliente: ${m.cliente_nombre}`].filter(Boolean).join(' · '), 'suave')
    );

    const cuadros = el('div', '', 'detalle-grid');
    cuadros.append(
      cajaDato('Última visita', f.ultima ? fmtFecha(f.ultima) : 'Sin visitas registradas'),
      cajaDato(
        'Próxima cita',
        f.proxima ? `${fmtFecha(f.proxima.fecha_hora)} · ${f.proxima.motivo}` : 'Sin cita programada'
      )
    );
    seccion.append(cuadros);

    // Opción para asignar la próxima cita (abre "Haz una cita" con la mascota ya elegida)
    const acciones = el('div', '', 'ficha-acciones');
    const agendar = el(
      'button',
      f.proxima ? 'Agendar otra cita' : 'Agendar próxima cita',
      'btn chico primario'
    );
    agendar.addEventListener('click', () => {
      $('detalle').close();
      cambiarVista('citas');
      abrirFormulario(null, { mascota: m.id });
    });
    acciones.append(agendar);
    seccion.append(acciones);

    seccion.append(el('strong', 'Historial'));
    if (!f.historial.length) {
      seccion.append(el('p', 'Aún no tiene consultas ni citas registradas.', 'estado'));
    }
    f.historial.forEach((h) => {
      const tarjeta = el('div', '', 'consulta');
      if (h.tipo === 'Consulta') {
        tarjeta.append(
          el('strong', `${fmtFecha(h.fecha)} · Consulta · ${h.motivo}`),
          el('p', `Diagnóstico: ${h.consulta.diagnostico}`),
          el('p', `Tratamiento: ${h.consulta.tratamiento}`)
        );
      } else {
        tarjeta.append(
          el('strong', `${fmtFecha(h.fecha)} · Cita · ${h.motivo}`),
          el('p', `Estado: ${ESTADOS_CITA[h.estado] || h.estado}`)
        );
      }
      seccion.append(tarjeta);
    });

    cont.append(seccion);
  });
}

// Quita caracteres que el PDF no muestra bien (espacios especiales, rayas largas, puntos suspensivos)
function limpiarPDF(texto) {
  return String(texto ?? '')
    .replace(/[\u202f\u00a0]/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');
}

// Descarga el reporte en PDF usando la librería externa jsPDF
function descargarPDF({ nombre, codigo, fichas }) {
  if (!window.jspdf) {
    mostrarMensaje('No se pudo cargar la librería jsPDF. Revisa tu conexión a internet.', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margen = 15;
  const anchoUtil = 210 - margen * 2;
  const limite = 297 - margen;
  let y = margen;

  // Escribe un texto (con saltos de línea y de página automáticos)
  const escribir = (texto, { tam = 10, negrita = false, color = [30, 41, 59], sangria = 0 } = {}) => {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal');
    doc.setFontSize(tam);
    doc.setTextColor(...color);
    const alto = tam * 0.42;
    doc.splitTextToSize(limpiarPDF(texto), anchoUtil - sangria).forEach((linea) => {
      if (y + alto > limite) {
        doc.addPage();
        y = margen;
      }
      doc.text(linea, margen + sangria, y);
      y += alto;
    });
  };

  escribir(`Reporte de ${nombre}${codigo ? ` (${codigo})` : ''}`, {
    tam: 16, negrita: true, color: [15, 118, 110],
  });
  escribir(`Generado el ${fmtFecha(new Date())}`, { tam: 9, color: [100, 116, 139] });
  y += 4;

  if (!fichas.length) escribir('Este cliente aún no tiene mascotas registradas.');

  fichas.forEach((f) => {
    const m = f.mascota;

    // Línea separadora entre mascotas
    if (y + 12 > limite) {
      doc.addPage();
      y = margen;
    }
    y += 3;
    doc.setDrawColor(203, 213, 225);
    doc.line(margen, y, 210 - margen, y);
    y += 6;

    escribir(`${m.nombre}${m.codigo ? ` (${m.codigo})` : ''}`, { tam: 13, negrita: true });
    escribir([m.especie, m.raza, `Cliente: ${m.cliente_nombre}`].filter(Boolean).join(' - '), {
      tam: 9, color: [100, 116, 139],
    });
    y += 2;
    escribir(`Última visita: ${f.ultima ? fmtFecha(f.ultima) : 'Sin visitas registradas'}`, { negrita: true });
    escribir(
      `Próxima cita: ${f.proxima ? `${fmtFecha(f.proxima.fecha_hora)} - ${f.proxima.motivo}` : 'Sin cita programada'}`,
      { negrita: true }
    );
    y += 3;
    escribir('Historial', { tam: 11, negrita: true });

    if (!f.historial.length) {
      escribir('Aún no tiene consultas ni citas registradas.', { sangria: 3 });
    }
    f.historial.forEach((h) => {
      y += 1.5;
      if (h.tipo === 'Consulta') {
        escribir(`${fmtFecha(h.fecha)} - Consulta: ${h.motivo}`, { negrita: true, sangria: 3 });
        escribir(`Diagnóstico: ${h.consulta.diagnostico}`, { sangria: 6 });
        escribir(`Tratamiento: ${h.consulta.tratamiento}`, { sangria: 6 });
        if (h.consulta.observaciones) {
          escribir(`Comentario: ${h.consulta.observaciones}`, { sangria: 6 });
        }
      } else {
        escribir(
          `${fmtFecha(h.fecha)} - Cita (${ESTADOS_CITA[h.estado] || h.estado}): ${h.motivo}`,
          { negrita: true, sangria: 3 }
        );
      }
    });
  });

  // Numeración de páginas
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Página ${i} de ${total}`, 210 - margen, 297 - 8, { align: 'right' });
  }

  const archivo = `reporte-${codigo || nombre}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(archivo.replace(/\s+/g, '-'));
  mostrarMensaje('PDF descargado correctamente.');
}

// ============ Reportes (pantalla de Reportes con CSV) ============
// Qué reportes existen: de dónde salen los datos, por qué campo de fecha se filtran y qué columnas llevan
const REPORTES = {
  clientes: {
    titulo: 'Clientes',
    ruta: 'clientes/',
    campoFecha: 'creado',
    columnas: [
      ['codigo', 'Código'],
      ['nombre', 'Nombre'],
      ['apellido', 'Apellido'],
      ['telefono', 'Teléfono'],
      ['email', 'Correo'],
      ['direccion', 'Dirección'],
      ['creado', 'Registrado', fmtFecha],
    ],
  },
  mascotas: {
    titulo: 'Mascotas',
    ruta: 'mascotas/',
    campoFecha: 'creado',
    resumenPor: 'especie',
    columnas: [
      ['codigo', 'Código'],
      ['nombre', 'Nombre'],
      ['especie', 'Especie'],
      ['raza', 'Raza'],
      ['sexo', 'Sexo'],
      ['cliente_nombre', 'Cliente'],
      ['fecha_nacimiento', 'Nacimiento'],
    ],
  },
  citas: {
    titulo: 'Citas',
    ruta: 'citas/',
    campoFecha: 'fecha_hora',
    filtroServicio: true,
    filtroEstado: true,
    resumenPor: 'motivo',
    columnas: [
      ['mascota_nombre', 'Mascota'],
      ['fecha_hora', 'Fecha y hora', fmtFecha],
      ['motivo', 'Servicio'],
      ['estado', 'Estado'],
    ],
  },
  consultas: {
    titulo: 'Consultas',
    ruta: 'consultas/',
    campoFecha: 'fecha',
    filtroServicio: true,
    resumenPor: 'motivo',
    columnas: [
      ['mascota_nombre', 'Mascota'],
      ['fecha', 'Fecha', fmtFecha],
      ['motivo', 'Servicio'],
      ['diagnostico', 'Diagnóstico', null, 'largo'],
      ['tratamiento', 'Tratamiento', null, 'largo'],
      ['observaciones', 'Comentario', null, 'largo'],
    ],
  },
};

let reporte = null; // { tipo, cfg, filas } del último reporte generado
let reportePagina = 1;
let reportePorPagina = 10;
let reportesListos = false;
let esperaReporte;

// Llena los <select> la primera vez que se abre la pantalla de reportes
function prepararReportes() {
  if (!reportesListos) {
    Object.entries(REPORTES).forEach(([clave, r]) =>
      $('rep-tipo').append(new Option(r.titulo, clave))
    );

    $('rep-servicio').append(new Option('Todos', ''));
    SERVICIOS.forEach((s) => $('rep-servicio').append(new Option(s, s)));

    $('rep-estado').append(new Option('Todos', ''));
    [['programada', 'Programada'], ['completada', 'Completada'], ['cancelada', 'Cancelada']]
      .forEach(([valor, texto]) => $('rep-estado').append(new Option(texto, valor)));

    reportesListos = true;
  }
  actualizarFiltrosReporte();
  dibujarReporte();
}

// Muestra u oculta los filtros que aplican al tipo de reporte elegido
function actualizarFiltrosReporte() {
  const cfg = REPORTES[$('rep-tipo').value];
  $('rep-wrap-servicio').classList.toggle('oculto', !cfg.filtroServicio);
  $('rep-wrap-estado').classList.toggle('oculto', !cfg.filtroEstado);
}

// FUNCIÓN: genera el reporte. Pide los datos a la API, aplica los filtros y guarda las filas.
async function generarReporte() {
  const tipo = $('rep-tipo').value;
  const cfg = REPORTES[tipo];
  const desde = $('rep-desde').value;
  const hasta = $('rep-hasta').value;

  if (desde && hasta && desde > hasta) {
    mostrarMensaje('La fecha «Desde» no puede ser posterior a «Hasta».', 'error');
    return;
  }

  const boton = $('btn-generar');
  boton.disabled = true;
  boton.textContent = 'Generando…';

  try {
    let datos = await api(cfg.ruta);

    if (desde) {
      const inicio = new Date(`${desde}T00:00:00`);
      datos = datos.filter((f) => new Date(f[cfg.campoFecha]) >= inicio);
    }
    if (hasta) {
      const fin = new Date(`${hasta}T23:59:59.999`);
      datos = datos.filter((f) => new Date(f[cfg.campoFecha]) <= fin);
    }

    const servicio = $('rep-servicio').value;
    if (cfg.filtroServicio && servicio) datos = datos.filter((f) => f.motivo === servicio);

    const estado = $('rep-estado').value;
    if (cfg.filtroEstado && estado) datos = datos.filter((f) => f.estado === estado);

    reporte = { tipo, cfg, filas: datos };
    reportePagina = 1;
    $('rep-buscar').value = '';
    dibujarReporte();
    mostrarMensaje(`Reporte de ${cfg.titulo.toLowerCase()} generado: ${datos.length} registro(s).`);
  } catch (e) {
    mostrarMensaje(textoError(e), 'error');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Generar reporte';
  }
}

// Filas del reporte que coinciden con el buscador reactivo
function filasDelReporte() {
  if (!reporte) return [];
  const q = $('rep-buscar').value.trim().toLowerCase();
  return reporte.filas.filter(
    (f) => !q || Object.values(f).join(' ').toLowerCase().includes(q)
  );
}

// Cuenta cuántas filas hay por cada valor de un campo (por ejemplo, citas por servicio)
function contarPor(lista, campo) {
  const cuenta = {};
  lista.forEach((f) => {
    const clave = f[campo] || '—';
    cuenta[clave] = (cuenta[clave] || 0) + 1;
  });
  return Object.entries(cuenta).sort((a, b) => b[1] - a[1]);
}

// Dibuja la vista previa del reporte: resumen, tabla y paginación
function dibujarReporte() {
  const thead = document.querySelector('#rep-tabla thead');
  const tbody = document.querySelector('#rep-tabla tbody');
  thead.replaceChildren();
  tbody.replaceChildren();
  $('rep-resumen').replaceChildren();
  $('rep-paginacion').replaceChildren();

  if (!reporte) {
    $('rep-mensaje').textContent =
      'Elige el tipo de reporte, ajusta los filtros y presiona «Generar reporte».';
    $('btn-csv').disabled = true;
    return;
  }

  const cfg = reporte.cfg;
  const visibles = filasDelReporte();
  $('btn-csv').disabled = !visibles.length;
  $('rep-mensaje').textContent = visibles.length ? '' : 'No hay registros con esos filtros.';

  // Resumen: total y desglose
  $('rep-resumen').append(el('span', `Total: ${visibles.length}`, 'chip chip-total'));
  if (cfg.resumenPor) {
    contarPor(visibles, cfg.resumenPor).forEach(([nombre, cantidad]) =>
      $('rep-resumen').append(el('span', `${nombre}: ${cantidad}`, 'chip'))
    );
  }

  // Tabla paginada
  const encabezado = document.createElement('tr');
  cfg.columnas.forEach(([, nombre]) => encabezado.append(el('th', nombre)));
  thead.append(encabezado);

  const paginas = Math.max(1, Math.ceil(visibles.length / reportePorPagina));
  if (reportePagina > paginas) reportePagina = paginas;
  const enPagina = visibles.slice(
    (reportePagina - 1) * reportePorPagina,
    reportePagina * reportePorPagina
  );

  enPagina.forEach((fila) => {
    const tr = document.createElement('tr');
    cfg.columnas.forEach(([clave, , formato, clase]) => {
      const valor = formato ? formato(fila[clave]) : fila[clave];
      tr.append(el('td', valor === '' || valor == null ? '—' : valor, clase || ''));
    });
    tbody.append(tr);
  });

  dibujarPaginacion($('rep-paginacion'), {
    total: visibles.length,
    pagina: reportePagina,
    porPagina: reportePorPagina,
    cambiar: (nuevo) => {
      reportePagina = nuevo.pagina;
      reportePorPagina = nuevo.porPagina;
      dibujarReporte();
    },
  });
}

// CSV: usa la librería externa PapaParse (Papa.unparse) para convertir las filas a texto CSV
function descargarCSV() {
  if (typeof Papa === 'undefined') {
    mostrarMensaje('No se pudo cargar la librería PapaParse. Revisa tu conexión a internet.', 'error');
    return;
  }

  const visibles = filasDelReporte();
  if (!reporte || !visibles.length) return;

  const columnas = reporte.cfg.columnas;
  const csv = Papa.unparse(
    {
      fields: columnas.map(([, nombre]) => nombre),
      data: visibles.map((fila) =>
        columnas.map(([clave, , formato]) => {
          const valor = formato ? formato(fila[clave]) : fila[clave];
          return valor ?? '';
        })
      ),
    },
    { escapeFormulae: true } // evita que Excel ejecute celdas que empiecen con = + - @
  );

  // "\ufeff" hace que Excel muestre bien los acentos
  const archivo = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `reporte-${reporte.tipo}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);

  mostrarMensaje('CSV descargado correctamente.');
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

  // Servicios, debajo de Consultas: cada uno abre su lista de citas
  MENU_SERVICIOS.forEach(([servicio, icono]) => {
    const boton = document.createElement('button');
    boton.dataset.vista = `servicio:${servicio}`;
    boton.append(el('span', icono), el('span', servicio));
    boton.addEventListener('click', () => cambiarVista('citas', servicio));
    menu.append(boton);
  });

  // Reportes, al final del menú
  const botonReportes = document.createElement('button');
  botonReportes.dataset.vista = 'reportes';
  botonReportes.append(el('span', '📊'), el('span', 'Reportes'));
  botonReportes.addEventListener('click', () => cambiarVista('reportes'));
  menu.append(botonReportes);

  document.querySelectorAll('#agenda-tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      pestanaAgenda = b.dataset.pestana;
      dibujarAgenda();
    })
  );

  $('btn-menu').addEventListener('click', () => $('lateral').classList.toggle('abierto'));
  $('btn-salir').addEventListener('click', cerrarSesion);
  $('btn-nuevo').addEventListener('click', () =>
    abrirFormulario(null, servicioActivo ? { motivo: servicioActivo } : {})
  );
  $('btn-cancelar').addEventListener('click', () => $('dialogo').close());
  $('btn-cerrar').addEventListener('click', () => $('detalle').close());

  // Buscador reactivo de las listas: filtra mientras se escribe y vuelve a la página 1
  $('buscar').addEventListener('input', () => {
    clearTimeout(esperaBusqueda);
    esperaBusqueda = setTimeout(() => {
      pagina = 1;
      dibujarTabla();
    }, 250);
  });

  // Pantalla de Reportes
  $('rep-tipo').addEventListener('change', () => {
    reporte = null;
    actualizarFiltrosReporte();
    dibujarReporte();
  });
  $('btn-generar').addEventListener('click', generarReporte);
  $('btn-csv').addEventListener('click', descargarCSV);
  $('rep-buscar').addEventListener('input', () => {
    clearTimeout(esperaReporte);
    esperaReporte = setTimeout(() => {
      reportePagina = 1;
      dibujarReporte();
    }, 250);
  });

  if (guardado.leer(CLAVE_TOKEN)) mostrarApp();
  else mostrarLogin();
}

iniciar();