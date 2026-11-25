// ============ Inicio: banners y resumen de servicios ============
const BANNERS_INICIO = [
  {
    clase: 'banner-cielo',
    texto: 'Confía el cuidado de tu mascota a nuestro equipo de veterinarios',
    imagen: '🐱🐶',
  },
  {
    clase: 'banner-azul',
    texto: 'Vacunas, desparasitantes y chequeos al día para su bienestar',
    imagen: '💉🐾',
  },
];

const SERVICIOS_INICIO = [
  { nombre: 'Consultas', icono: '🩺', texto: 'Atención personalizada para evaluar a tu mascota y brindarle los cuidados que necesita.' },
  { nombre: 'Vacunas', icono: '💉', texto: 'Protección preventiva mediante vacunas que ayudan a mantener a tu mascota saludable.' },
  { nombre: 'Desparasitantes', icono: '💊', texto: 'Tratamientos especializados para eliminar parásitos y cuidar su salud.' },
  { nombre: 'Profilaxis dental', icono: '🦷', texto: 'Cuidado e higiene bucal para prevenir problemas dentales y mantener sus dientes limpios.' },
  { nombre: 'Esterilizaciones', icono: '✂️', texto: 'Procedimiento veterinario para evitar la reproducción y favorecer una vida saludable.' },
];

// Carrusel sencillo: una fila que se desplaza con las flechas
function crearCarrusel() {
  const caja = el('div', '', 'carrusel');
  const pista = el('div', '', 'carrusel-pista');

  const mover = (sentido) => {
    const primero = pista.firstElementChild;
    if (!primero) return;
    pista.scrollBy({ left: sentido * (primero.offsetWidth + 16), behavior: 'smooth' });
  };

  const flecha = (texto, clase, sentido, nombre) => {
    const boton = el('button', texto, `carrusel-flecha ${clase}`);
    boton.type = 'button';
    boton.setAttribute('aria-label', nombre);
    boton.addEventListener('click', () => mover(sentido));
    return boton;
  };

  caja.append(pista, flecha('‹', 'izq', -1, 'Anterior'), flecha('›', 'der', 1, 'Siguiente'));
  return { caja, pista };
}

function dibujarInicioServicios() {
  const contenedor = $('inicio-servicios');
  contenedor.replaceChildren();

  // Banners
  const banners = crearCarrusel();
  BANNERS_INICIO.forEach((b) => {
    const banner = el('div', '', `banner ${b.clase}`);
    banner.append(el('p', b.texto, 'banner-texto'), el('span', b.imagen, 'banner-imagen'));
    banners.pista.append(banner);
  });

  // Título de la sección
  const titulo = el('div');
  titulo.append(
    el('h2', 'Nuestros servicios', 'servicios-titulo'),
    el('p', 'Atención profesional para cada etapa de la vida de tu mascota', 'servicios-sub')
  );

  // Tarjetas de servicios
  const servicios = crearCarrusel();
  SERVICIOS_INICIO.forEach((s) => {
    const tarjeta = document.createElement('button');
    tarjeta.type = 'button';
    tarjeta.className = 'servicio-tarjeta';
    tarjeta.append(el('span', s.icono, 'icono'), el('span', s.nombre, 'titulo'), el('span', s.texto, 'texto'));
    tarjeta.addEventListener('click', () => {
      if (s.nombre === 'Consultas') cambiarVista('consultas');
      else cambiarVista('citas', s.nombre);
    });
    servicios.pista.append(tarjeta);
  });

  contenedor.append(banners.caja, titulo, servicios.caja);
}

dibujarInicioServicios();