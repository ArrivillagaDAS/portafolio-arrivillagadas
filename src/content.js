// Todo el texto del portafolio en un solo lugar.
// Fuentes: README del perfil de GitHub y el portafolio web (portafolio_angela-arrivillaga).

export const SITE = {
  name: 'ANGELA ARRIVILLAGA',   // se escribe con bloques en el claro central (letras A-Z y espacios)
  short: 'Sofi',
  role: 'Desarrolladora Junior en formación',
  intro: 'Explora el bosque con el gato: cada lugar es una sección de mi portafolio.',
};

export const PROFILE = [
  ['Rol', 'Desarrolladora Junior en formación'],
  ['Estudia', 'Desarrollo de Software · Diseño y Desarrollo de Videojuegos'],
  ['Etapa', 'Segundo año universitario'],
  ['Busca', 'Prácticas y primeras experiencias profesionales'],
  ['Ubicación', 'Guatemala, Guatemala'],
];

export const ABOUT = {
  title: 'Sobre mí',
  text: [
    'Soy Sofi, estudiante de segundo año de Desarrollo de Software y de Diseño y Desarrollo de Videojuegos. Mis proyectos académicos y personales son la evidencia de lo que sé hacer.',
    'Me mueve la programación, el desarrollo frontend, el diseño de interfaces y todo lo que hay detrás de un videojuego. Fuera del código me gustan el dibujo, la pintura, el arte digital, el pixel art y Blender; disfruto aprender idiomas y jugar League of Legends y Overwatch.',
    'Quiero crecer en desarrollo de software y, a futuro, en la industria de videojuegos, con responsabilidad, honestidad y mucha curiosidad.',
  ],
};

export const PROJECTS = [
  {
    title: 'ALBA',
    type: 'App móvil de salud y adherencia a medicamentos',
    desc: 'Proyecto académico grupal para mejorar la adherencia a medicamentos de adultos mayores en Guatemala. Tres perfiles (Adulto Mayor, Cuidador y Doctor), vinculación por QR, recordatorios y consulta de nutrición y ejercicio.',
    role: 'Senior UI Accessibility & Theme: accesibilidad, alto contraste e interfaz sencilla.',
    tech: ['Flutter', 'Dart', 'Firebase', 'Cloud Firestore', 'Git'],
    url: 'https://github.com/ArrivillagaDAS/proyecto_alba_guatemala',
    demo: 'https://arrivillagadas.github.io/mockup_alba_01/',
  },
  {
    title: 'CampusShop',
    type: 'Tienda en línea universitaria',
    desc: 'E-commerce con catálogo, carrito, checkout e historial de compras, hecho con HTML, CSS y JavaScript sin frameworks.',
    tech: ['HTML', 'CSS', 'JavaScript'],
    url: 'https://github.com/ArrivillagaDAS/campusshop-ecommerce',
    demo: 'https://arrivillagadas.github.io/campusshop-ecommerce/',
  },
  {
    title: 'Distribuidora del Valle',
    type: 'Panel web para base de datos',
    desc: 'Panel con Express y HTML/JS conectado a MySQL para gestionar inventario, pedidos y ventas por sede.',
    tech: ['Node.js', 'Express', 'MySQL', 'JavaScript'],
    url: 'https://github.com/ArrivillagaDAS/distribuidora-del-valle-web',
  },
  {
    title: 'CampusParking',
    type: 'Aplicación web',
    desc: 'Aplicación web para la gestión de un parqueo del campus.',
    tech: ['JavaScript', 'HTML', 'CSS'],
    url: 'https://github.com/ArrivillagaDAS/campusparking_web',
    demo: 'https://arrivillagadas.github.io/campusparking_web/',
  },
  {
    title: 'Gato gamer portfolio',
    type: 'Experiencia 3D interactiva',
    desc: 'Portafolio 3D con un gato personalizable que explora una habitación gamer: física, minijuego de arcade y música generada en vivo.',
    tech: ['Three.js', 'Rapier', 'Web Audio', 'Vite'],
    url: 'https://github.com/ArrivillagaDAS/gato-gamer-portfolio',
    demo: 'https://arrivillagadas.github.io/gato-gamer-portfolio/',
  },
];

export const SKILLS = [
  { group: 'En práctica', items: ['HTML', 'CSS', 'JavaScript', 'Python', 'Git', 'GitHub', 'VS Code', 'Canva'] },
  { group: 'En aprendizaje', items: ['MySQL', 'PostgreSQL', 'Postman', 'n8n', 'Node.js'] },
  { group: 'Familiar', items: ['TypeScript', 'Docker'] },
];

export const PROCESS = ['Análisis', 'Estructura', 'Desarrollo', 'Validación', 'Documentación', 'Mejora'];

export const CONTACT = {
  text: 'Busco prácticas y primeras experiencias profesionales. Escríbeme o revisa mi código.',
  links: [
    { label: 'GitHub', url: 'https://github.com/ArrivillagaDAS' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/angela-arrivillaga-4290aa425' },
    { label: 'Correo', url: 'mailto:sfaaldana101@gmail.com' },
    { label: 'Portafolio web', url: 'https://arrivillagadas.github.io/portafolio_angela-arrivillaga/' },
  ],
};

/** Una frase por pescado dorado del laberinto: lo que me motiva a seguir. */
export const MOTIVATIONS = [
  'Hoy estudio Desarrollo de Software; mañana quiero diseñar y desarrollar videojuegos.',
  'Sueño con traer a Guatemala más oportunidades en la industria de los videojuegos.',
  'Me encanta convertir la creatividad en cosas que funcionan.',
  'Crear videojuegos es mi forma favorita de unir arte, lógica y emoción.',
  'Cada día aprendo algo nuevo, y cada reto se vuelve una habilidad.',
  'Quiero que lo que construyo ayude a personas reales, como ALBA a los adultos mayores.',
  'Cada línea de código me acerca un poco más a mi meta.',
];
