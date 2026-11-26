# PhoneCity — Reglas de diseño

Objetivo: que PhoneCity se sienta una **app**, no una página web. Estilo limpio tipo Apple, en portátil, tablet, iPhone Duo y móvil normal.

Estas reglas se aplican a toda pantalla nueva o que se toque. No se rediseña nada que la tarea no pida.

---

## 1. Principios

1. **Haz que funcione, luego hazlo bonito.** Ningún cambio visual rompe un flujo que ya funciona.
2. **La página nunca hace scroll.** Lo que se mueve es el contenido dentro de su contenedor; las barras quedan fijas.
3. **Menos es más.** Sin sombras duras, sin bordes gruesos, sin colores saturados de fondo. El minimalismo es para la estructura: el color se reserva para los estados y las acciones (ver *Colores de acción*).
4. **Táctil primero.** Todo lo pulsable mide al menos 44 × 44 px.
5. **Nada decorativo se mueve.** Las animaciones solo acompañan una acción del usuario.

## 2. Anchos (breakpoints)

| Nombre | Ancho | Dispositivos | Navegación |
|---|---|---|---|
| `movil` | ≤ 600 px | Móviles, pantalla exterior del iPhone Duo (≈ 382 px) | **Pestañas abajo** |
| `medio` | 601 – 1024 px | Tablets, pantalla interior del iPhone Duo (hasta ≈ 951 px) | Barra arriba en fila |
| `escritorio` | > 1024 px | Portátil | Barra arriba en fila |

Se definen una sola vez como mixins SCSS (`@include movil { … }`, `@include medio { … }`) y se usan siempre esos nombres. Nada de cifras sueltas en los componentes.

Plegables: hoy se diseña **por ancho**. La Viewport Segments API (`@media (horizontal-viewport-segments: 2)`) queda para una mejora progresiva posterior.

## 3. Armazón (app shell)

```
┌───────────────────────────────┐
│ Barra superior (fija)         │  ← escritorio / medio
├───────────────────────────────┤
│                               │
│  <main> — único que hace      │
│  scroll                       │
│                               │
├───────────────────────────────┤
│ Pestañas (fijas)              │  ← solo movil
└───────────────────────────────┘
```

- `html, body`: `height: 100dvh; overflow: hidden;`
- El armazón es una rejilla de 3 filas: barra · contenido · pestañas.
- `main`: `overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;`
- Dentro de una pantalla, si hay lista + detalle, cada uno tiene su propio scroll.
- **Safe area del iPhone:** la barra superior suma `env(safe-area-inset-top)` y las pestañas `env(safe-area-inset-bottom)`. `index.html` lleva `viewport-fit=cover`.
- Sin scroll horizontal en ningún ancho. Las tablas anchas hacen scroll **dentro** de su contenedor.

## 4. Navegación

**Escritorio y medio:** barra superior en una sola fila, sin scroll lateral:
- Izquierda: "PhoneCity" en escritorio; en medio, solo el icono de la app (28 px).
- Centro: **Tablero · Reparaciones · Clientes · Notas · Etiquetas** como control segmentado: icono + texto en píldoras dentro de un carril gris suave. La activa, con fondo acento suave, texto `--color-acento` y peso 600. Hover y `scale(0.97)` al pulsar. Si la barra mide menos de 720 px (container query), el segmentado pasa a solo iconos con `title`.
- Derecha: un único botón ⚙ **Ajustes** con menú desplegable: Divisor de fecha · Importar · Cerrar sesión (rojo). Se cierra con clic fuera, Escape o al navegar.
- "Nueva línea" no va en la barra: es un botón verde en las acciones del tablero.

**Móvil:** barra de pestañas abajo, estilo iOS:
- Máximo 5 pestañas, con icono y texto corto debajo: **Tablero · Nueva · Reparaciones · Clientes · Más**.
- "Nueva" lleva su + dentro de un círculo verde (`accion-crear`).
- "Más" abre una hoja (bottom sheet) con Notas, Etiquetas y las mismas opciones del menú Ajustes: Divisor de fecha · Importar · Cerrar sesión.
- Pestaña activa con el color de acento; las demás en gris.
- Fondo translúcido con desenfoque.

## 5. Tokens

Se definen como variables CSS en `:root` (en `styles.scss`) y se usan siempre a través de ellas.

### Color

| Token | Uso | Valor |
|---|---|---|
| `--color-fondo` | Fondo de la app | `#f5f5f7` |
| `--color-superficie` | Tarjetas, paneles, modales | `#ffffff` |
| `--color-texto` | Texto principal | `#1d1d1f` |
| `--color-texto-2` | Texto secundario | `#6e6e73` |
| `--color-borde` | Separadores | `rgba(0,0,0,0.08)` |
| `--color-acento` | Acción principal, pestaña activa | `#0071e3` |
| `--color-peligro` | Borrar, errores | `#d70015` |
| `--color-exito` | Confirmaciones | `#1a7f37` |

Los colores de los **estados de línea** siguen saliendo de `estados.ts`; no se duplican aquí.

### Colores de acción

Es una herramienta interna de trabajo: cada acción lleva un color con significado para reconocerla de un vistazo. **Misma acción, mismo color e icono en toda la app** (barra, cabeceras, hoja de detalle, tarjetas, modales).

| Acción | Dónde | Fondo | Texto | Contraste | Icono |
|---|---|---|---|---|---|
| Crear | Nueva línea | `--color-crear` `#1a7f37` | blanco | 5,1 : 1 | `crear` (+) |
| Pedido | Generar pedido | `--color-pedido` `#e8590c` | blanco | 3,6 : 1 | `pedido` (portapapeles con lista) |
| Avisar | WhatsApp, Avisar clientes, Enviar | `--color-avisar` `#25d366` | `#1d1d1f` | 8,5 : 1 | `whatsapp` (logo oficial blanco) |
| Taller | Consulta de taller | `--color-taller` `#7048e8` | blanco | 5,5 : 1 | `taller` (llave inglesa) |
| Editar | Editar línea | `--color-editar` `#f59f00` | `#1d1d1f` | 7,9 : 1 | `editar` (lápiz) |
| Imprimir | Tickets, etiquetas | `--color-imprimir` `#343a40` | blanco | 11,6 : 1 | `ticket` / `etiqueta` / `envio` |
| Peligro | Cerrar sesión, borrar | `--color-peligro` `#d70015` | blanco | 5,4 : 1 | `salir` |

- Avisar usa `#25d366` con texto oscuro y no `#128c7e` con blanco (4,1 : 1): es más legible.
- **Logo de WhatsApp:** siempre los SVG oficiales de `public/iconos/`, con `<img>` y sin tocar trazos ni colores (Meta no lo permite; nada de máscaras ni variantes dibujadas). `<app-icono nombre="whatsapp">` (blanco) en botones verdes; `nombre="whatsapp-verde"` sobre fondo blanco. `alt=""`; el texto o el `aria-label` va en el botón.
- Cada color tiene su pareja `--color-<accion>-texto`.
- En el HTML se pone la clase global `accion-<accion>` en el botón (`accion-crear`, `accion-pedido`, …). La clase solo define `--accion`, `--accion-texto` y `--accion-hover`; el estilo del botón los usa (`background: var(--accion, <gris>)`). Sin clase, el botón queda gris.
- Cerrar sesión en la barra va como texto rojo, no como botón relleno.
- Las clases están en `src/styles/_acciones.scss`; los colores, en `:root` de `styles.scss`.

### Tipografía

- Fuente del sistema: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`.
- Tamaños: 12 · 14 · 16 · 20 · 28 px. Texto normal 14 px en escritorio y 16 px en móvil.
- **Inputs a 16 px en móvil siempre** (si no, el iPhone hace zoom).
- Pesos: 400 normal, 600 títulos y botones. Nada de 700/800 salvo cifras grandes.

### Espaciado, radios y sombras

| Token | Valor |
|---|---|
| `--esp-1 … --esp-6` | 4 · 8 · 12 · 16 · 24 · 32 px |
| `--radio-s` | 8 px (inputs, botones) |
| `--radio-m` | 12 px (tarjetas) |
| `--radio-l` | 16 px (modales, hojas) |
| `--sombra-1` | `0 1px 3px rgba(0,0,0,0.06)` |
| `--sombra-2` | `0 8px 24px rgba(0,0,0,0.12)` (flotantes) |
| `--desenfoque` | `saturate(180%) blur(20px)` sobre fondo `rgba(255,255,255,0.72)` |

## 6. Componentes

- **Botones:** radio 8 px, sin borde en el principal (fondo acento, texto blanco), secundario con fondo gris claro. Altura mínima 44 px en móvil. `:focus-visible` con contorno de 3 px.
- **Inputs:** fondo blanco, borde 1 px `--color-borde`, radio 8 px; al enfocar, borde acento + halo suave. Sin sombra interior de Bootstrap.
- **Tarjetas y paneles:** fondo superficie, radio 12 px, `--sombra-1`.
- **Modales:** en escritorio, centrados con radio 16 px. **En móvil, hoja que sube desde abajo** (bottom sheet) a ancho completo.
  - Se usa siempre `<app-ventana titulo="…" ancho="…">` (`core/layout/ventana`): en escritorio, ventana con cabecera y pie fijos y cuerpo con scroll; en móvil, `<app-hoja>`. Escape y clic fuera cierran. El pie se proyecta con `ngProjectAs="[ventana-pie]"` y `[conPie]="true"`.
  - Botones dentro: clase global `.boton-app` (+ `.pequeno`), con color de acción si aplica. Botón solo icono en filas: `.boton-icono`.
- **Tablas en móvil:** se muestran como **tarjetas apiladas**, no como tabla. Cada tarjeta enseña lo esencial (L-ID, modelo, estado, cliente) y se abre al pulsar.
- **Bootstrap:** se puede seguir usando la rejilla y las utilidades. Botones, inputs y modales nuevos usan estas reglas, no el aspecto Bootstrap.

## 7. Animación

| Qué | Cómo |
|---|---|
| Cambio de pantalla | View Transitions del router (`withViewTransitions()`), fundido corto |
| Abrir panel, hoja o modal | 250 ms, `cubic-bezier(0.32, 0.72, 0, 1)` (curva tipo iOS) |
| Hover y pulsación | 150 ms; al pulsar, `transform: scale(0.97)` |
| Listas | Sin animar cada fila |

- Solo se animan `transform` y `opacity`, nunca alto, ancho ni márgenes.
- Se respeta `@media (prefers-reduced-motion: reduce)`: sin animaciones.

## 8. PWA

- `manifest.webmanifest` con `display: "standalone"`, nombre "PhoneCity", colores de fondo y tema, e iconos.
- Metas iOS en `index.html`: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon` 180 × 180.
- **Sin service worker.** Cada despliegue por rsync se ve al instante.

## 9. Comprobación de cada pantalla

Antes de dar por terminada una pantalla, comprobar en las herramientas de desarrollo del navegador:

| Ancho | Qué mirar |
|---|---|
| 382 px | Pantalla exterior del Duo: nada cortado, pestañas abajo, sin scroll horizontal |
| 390 px | iPhone normal |
| 951 px | Pantalla interior del Duo en horizontal |
| 1280 px | Portátil |

En todos: la página no hace scroll; solo el contenido.
