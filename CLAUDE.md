# PhoneCity — Frontend (phonecity-app)

App de gestión de reparaciones para una tienda de móviles (tienda 319, Ponferrada). Sustituye a un Google Sheets. Un solo técnico la usa a diario; se presentará al resto de tiendas.

El dueño del código es Fernando. Él decide la estructura. Tú propones, explicas y ejecutas lo que apruebe.

---

## Forma de trabajar (obligatorio)

1. **Español.** Tono directo y técnico. Sin introducciones ni conclusiones. Viñetas, tablas o código; nada de párrafos largos.
2. **Planificar antes de tocar código.** Ante cualquier tarea:
   - Lee los archivos implicados.
   - Responde con diagnóstico en tres ejes: **Mal** (estado actual) · **Bien** (estado objetivo) · **Acción** (qué archivos vas a tocar y qué cambia en cada uno).
   - Haz las preguntas que haga falta y **espera**.
   - No edites ningún archivo hasta que Fernando apruebe ("ejecuta", "implementa", "genera", "construye", "adelante", "ok"). Si hay duda, sigue planificando.
3. **Cambios quirúrgicos.** Edita solo lo necesario. No reescribas archivos enteros ni reformatees código que no toca la tarea.
4. **Sin comentarios en el código** salvo que se pidan.
5. **Explica cada cambio** al terminar: qué archivo, qué hace, por qué va ahí. Fernando tiene que entender todo lo que entra.
6. **Una tarea cada vez.** No arregles de paso cosas que no se han pedido; anótalas al final como sugerencia.
7. "Haz que funcione, luego hazlo bonito".

## Prohibido

| Nunca | Motivo |
|---|---|
| `git commit`, `git push`, `git reset`, `git rebase`, crear ramas | Los commits los hace Fernando, siempre en `main` |
| `rsync`, `scp`, `ssh`, cualquier conexión a `192.168.1.41` | Producción se despliega a mano |
| Leer, mostrar o editar `.env` o archivos con secretos | Seguridad |
| `ng build --configuration production` seguido de copia a ningún sitio | Despliegue manual |
| Instalar dependencias nuevas sin preguntar | Mantener el proyecto ligero |
| Añadir líneas de atribución (`Co-Authored-By`, etc.) en ningún sitio | Decisión del dueño |

`git status`, `git diff`, `git log` y `git checkout -- <archivo>` (solo si Fernando lo pide) sí están permitidos.

## Verificación antes de decir "terminado"

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Debe salir sin errores. Después indica qué probar a mano en `ng serve` (http://localhost:4200) y con qué pasos.

---

## Stack

| Capa | Detalle |
|---|---|
| Framework | Angular 19, componentes standalone, signals, zone.js (`provideZoneChangeDetection({ eventCoalescing: true })`) |
| Estilos | Bootstrap 5 + SCSS por componente. A Fernando no le gusta el aspecto Bootstrap: preferir estilo limpio tipo Apple |
| Locale | `es-ES` |
| API local | `environment.ts` → `apiUrl: http://localhost:3000/api` |
| Backend | Repo hermano `../api-phonecity-app` (Express 5 + MariaDB) |

## Estructura

```
src/app/
├── core/
│   ├── estados/estados.ts        → estados, flujos, filtros inteligentes
│   ├── etiquetas/                → etiquetas adhesivas 48×28 (CLABEL 221D)
│   ├── tickets/                  → tickets 80 mm (simple / completo)
│   ├── impresion/puente.ts       → contrato window.phonecity (Electron, aún sin cáscara)
│   ├── guards/ interceptors/ handlers/
│   ├── models/                   → linea, cliente, nota, api-response
│   ├── services/                 → un servicio HTTP por recurso
│   └── utils/texto.util.ts       → normalización de texto
└── features/
    ├── tablero/                  → pantalla principal (tabla de líneas, panel de detalle, búsqueda)
    ├── reparaciones/             → vista de reparaciones con temporizadores
    ├── linea-form/               → alta de línea (tiene un modo edición muerto: no ampliarlo)
    ├── linea-detalle/ cliente-selector/ clientes/ notas/
    ├── avisar-modal/             → avisar clientes por WhatsApp
    ├── pedido-modal/ consulta-taller-modal/ import/ auth/login/
```

## Dominio

| Concepto | Detalle |
|---|---|
| Línea | Una reparación / pedido / venta. `id` = número de etiqueta física **L-XXXX** |
| Flujo y fase | Máquina de estados: `flujo` + `fase` + flags `avisado`, `movil_en_tienda` |
| Piezas | Una línea tiene N piezas (`linea_pieza`). El total de la línea = suma de piezas, bloqueado |
| Historial | `linea_historial` registra cada cambio de estado (datos desde 26/06/2026) |
| Cliente | Opcional en la línea (de momento) |

## Decisiones cerradas (no reabrir)

- Proveedor por línea, no por pieza.
- Total de la línea calculado y bloqueado; descuentos en cada pieza.
- Ningún ticket lleva copia para la tienda ni firma.
- Etiqueta de dispositivo y etiqueta de envío son distintas; el taller debe verse en la de envío.
- Calibración de etiqueta: 48 × 28 mm, `translateY` 1 mm, escala 1.00, márgenes 1.4 / 1.8 mm. Impresora térmica: solo blanco y negro.
- Datos estructurados nunca en texto libre (ni en `notas`).
- Avisos de temporizador en el tablero: descartados.
- Editor de etiquetas: solo texto, sin canvas.

## Fecha clave

**29/11/2026:** presentación a todas las tiendas. Prioridad: que funcione y se vea bien en portátil, móvil normal e iPhone Duo.
