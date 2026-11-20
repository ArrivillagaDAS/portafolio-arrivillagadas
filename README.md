# Portafolio Arrivillaga

Portafolio web interactivo en 3D. El visitante personaliza un gato y explora con él un bosque abierto: cada lugar del mapa es una sección del portafolio. La idea toma como referencia conceptual los portafolios de mundo abierto (navegar explorando en lugar de usar menús), con un gato en lugar de un vehículo.

**Sitio publicado:** https://arrivillagadas.github.io/portafolio-arrivillagadas/

Todo corre en el navegador con Three.js y Rapier, sin modelos de pago: los modelos vienen de paquetes gratuitos (CC0 y CC BY) y el resto se construye con geometrías primitivas y texturas de canvas.

## Estado

Fase 1: mapa en caja gris. El terreno, los caminos y las zonas ya están en su lugar, con el gato caminando y la cámara alta. Las siguientes fases agregan la ambientación, el contenido final, la cabaña con el cuarto gamer y el laberinto.

## Mapa

| Zona | Sección |
|---|---|
| Claro central | Nombre en bloques que el gato puede derribar |
| Sendero de proyectos | Un letrero por proyecto; al acercarse se abre su ficha |
| Cabaña | Sobre mí (después: el cuarto gamer como interior) |
| Árbol de habilidades | Lista de tecnologías, faroles y escalones para trepar |
| Buzón | Contacto |
| Zona de juegos | Latas como bolos y estambres |
| Lago | Zona de paisaje |
| Laberinto de setos | Jardín secreto (próximamente) |

## Controles

| Acción | Teclado y mouse | Táctil |
|---|---|---|
| Moverse | `WASD` o flechas | Joystick |
| Correr | `Shift` | Joystick al máximo |
| Saltar | `Espacio` | Botón de salto |
| Cabezazo | `E` | Botón de huella |
| Girar la cámara | Arrastrar con clic izquierdo | Deslizar un dedo |
| Zoom | Rueda | Pellizcar |
| Volver a la personalización | `Esc` o "Editar gato" | "Editar gato" |

## Editar el contenido

Todos los textos (nombre, rol, proyectos, habilidades y contacto) están en [`src/content.js`](src/content.js). El nombre del claro central se escribe con bloques y admite letras de la A a la Z.

## Desarrollo

Requiere Node.js 18 o superior.

```bash
npm install
npm run dev
```

El servidor de desarrollo queda en `http://localhost:5175`.

```bash
npm run build
npm run preview
```

## Despliegue

Cada push a `main` compila el proyecto y lo publica en GitHub Pages con el workflow `.github/workflows/deploy.yml`. En el build, Vite usa la ruta base `/portafolio-arrivillagadas/`.

## Flujo de ramas

- `main`: versión estable.
- `dev`: integración.
- `feature/<nombre>`: cada funcionalidad nueva sale de `dev` y vuelve a `dev` con un merge sin fast-forward.

Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/).

## Tecnologías

- [Three.js](https://threejs.org/) 0.170
- [Rapier](https://rapier.rs/) 0.14 (`@dimforge/rapier3d-compat`)
- [Vite](https://vitejs.dev/) 5
- Web Audio API

## Créditos de modelos

El detalle por archivo está en [`public/models/CREDITS.md`](public/models/CREDITS.md). El sitio incluye una ventana de créditos accesible desde la personalización y desde el botón "Créditos".

- Gato: [Quaternius](https://poly.pizza/m/qKICY6xla2), CC0.
- Muebles y objetos: [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit), CC0.
- Repisas: [KayKit Furniture Bits](https://kaylousberg.itch.io/furniture-bits) de Kay Lousberg, CC0.
- Taza: [MilkAndBanana](https://poly.pizza/m/54cOZNS04L), CC0.
- Torre de PC: "Gaming Computer" de [Alex Safayan](https://poly.pizza/m/5cN7W4ufoII), CC BY 3.0.
- Mando: "Low Poly Controller" de [Ginsta](https://poly.pizza/m/fCyA3Ug79X), CC BY 3.0.
- Audífonos: "Headphones" de [Ginsta](https://poly.pizza/m/VLB0kuGDoP), CC BY 3.0.
