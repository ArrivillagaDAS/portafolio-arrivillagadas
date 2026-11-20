// Todo el texto del portafolio en un solo lugar. Cambia aquí nombre, proyectos, habilidades y contacto.

export const SITE = {
  name: 'ARRIVILLAGA',          // se escribe con bloques en el claro central (solo letras A-Z y espacios)
  role: 'Desarrollador creativo',
  intro: 'Explora el bosque con el gato. Cada lugar es una sección de mi portafolio.',
};

export const PROJECTS = [
  {
    title: 'Gato gamer portfolio',
    desc: 'Portafolio 3D con un gato personalizable que explora una habitación gamer, con física, minijuego y música generada.',
    tech: ['Three.js', 'Rapier', 'Web Audio', 'Vite'],
    url: 'https://github.com/ArrivillagaDAS/gato-gamer-portfolio',
  },
  {
    title: 'Proyecto dos',
    desc: 'Describe aquí otro proyecto: qué problema resuelve y qué hiciste tú.',
    tech: ['JavaScript', 'API REST'],
    url: '',
  },
  {
    title: 'Proyecto tres',
    desc: 'Describe aquí un tercer proyecto. Puedes agregar o quitar entradas de esta lista.',
    tech: ['Node.js', 'Base de datos'],
    url: '',
  },
];

export const ABOUT = {
  title: 'Sobre mí',
  text: 'Escribe aquí una presentación corta: quién eres, qué te gusta construir y qué buscas.',
};

export const SKILLS = ['JavaScript', 'Three.js', 'WebGL', 'Rapier', 'Node.js', 'HTML y CSS', 'Git', 'Diseño de APIs'];

export const CONTACT = {
  text: 'Escríbeme para colaborar o para hablar de una oportunidad.',
  links: [
    { label: 'GitHub', url: 'https://github.com/ArrivillagaDAS' },
    { label: 'Correo', url: 'mailto:tu-correo@ejemplo.com' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
  ],
};
