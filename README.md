# Cushqui

App web y móvil para gestionar gastos diarios, cuentas y categorías. Hecha con Next.js 16, React 19 y Tailwind CSS 4, en modo oscuro.

## Puesta en marcha

1. Arranca el backend de Cushqui en `http://localhost:3000`.
2. Instala dependencias y arranca el frontend (puerto 3001):

```bash
npm install
npm run dev
```

3. Abre http://localhost:3001 y regístrate.

No hace falta configurar la URL de la API. El navegador llama a `/api/v1` y Next la reenvía al backend (`BACKEND_URL`, por defecto `http://localhost:3000`). En producción funciona igual. Ver `.env.example`.

## Probar en el teléfono

- **En el navegador:** con el teléfono en la misma Wi-Fi, abre `http://<IP-del-PC>:3001`. Next acepta automáticamente las IPs de la red local.
- **Como app instalada (PWA):** instalar exige HTTPS. Instala cloudflared una vez (`winget install Cloudflare.cloudflared`) y, con `npm run dev` corriendo, ejecuta `npm run tunnel`. Abre en el teléfono la URL `https://….trycloudflare.com` que aparece y usa "Instalar app" o "Añadir a pantalla de inicio". Funciona con el backend local.
- **Rendimiento real:** `npm run build && npm start`. El modo `dev` es bastante más lento.

## Flujo de trabajo y despliegue

```
feature/* ──PR──▶ main ──merge──▶ GitHub Actions ──▶ Vercel (producción)
```

1. Crea la rama desde `main`: `git checkout main && git pull && git checkout -b feature/x`.
2. Desarrolla y prueba en local, contra tu backend y tu base de datos locales.
3. Sube la rama y abre un PR hacia `main`. La CI ejecuta lint, typecheck y build.
4. Al hacer merge del PR, el flujo **Deploy production** publica en Vercel.

- **CI** (`.github/workflows/ci.yml`): en cada PR a `main` ejecuta lint, typecheck y build.
- **Despliegue** (`.github/workflows/deploy-prod.yml`): solo cuando se fusiona un PR en `main`. Un push directo a `main` no despliega. Desde la pestaña Actions se puede repetir a mano con "Run workflow".
- **Vercel** (`vercel.json`): los despliegues automáticos por Git están desactivados; solo despliega el flujo anterior.
- **Secretos** (GitHub → Settings → Environments → `production`): `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`.
- **Variables en Vercel** (proyecto `cushqui-frontend`, entorno Production): `BACKEND_URL=https://cushqui-backend.vercel.app`. El navegador llama a `/api/v1` en el propio dominio y Vercel lo reenvía al backend, así que no hace falta tocar el CORS del backend.

## PWA

- `src/app/manifest.ts`: nombre, colores y modo `standalone`, que abre la app sin la barra del navegador.
- `src/lib/app-icon.tsx`: el icono se genera por código. Lo usan `src/app/icons/[name]/route.tsx` (192, 512 y maskable), `src/app/apple-icon.tsx` y `src/app/icon.tsx`.
- No hay service worker: la app necesita conexión. Para modo offline se puede añadir [Serwist](https://github.com/serwist/serwist).

## Pantallas

| Ruta                                                                        | Pantalla                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `/login`, `/registro`                                                       | Acceso y registro (email y contraseña)                                    |
| `/`                                                                         | Inicio: balance, periodo (semana, mes o año), gráfico y desglose hasta los movimientos |
| `/transacciones`                                                            | Gastos, ingresos y movimientos por clasificar                             |
| `/transacciones/nueva`, `/transacciones/[id]`, `/transacciones/[id]/editar` | Alta, detalle y edición, con "Dividir cuenta"                             |
| `/cuentas`, `/cuentas/nueva`, `/cuentas/[id]`                               | Cuentas con icono, color y saldo                                          |
| `/cuentas/transferencias` | Historial de movimientos: aperturas, ajustes y transferencias (solo estas se editan) |
| `/categorias`, `/categorias/nueva`, `/categorias/[id]`                      | Categorías y subcategorías                                                |
| `/categorias/[id]/movimientos` | Movimientos de una categoría o subcategoría. Se abre desde Inicio, no está en el menú |

## Decisiones a tener en cuenta

- **Dividir cuenta.** Cada parte se redondea hacia arriba al céntimo. Si los céntimos acaban en 8 o 9, se sube a la décima siguiente: 6,4816 → 6,50, 9,98 → 10,00 y 9,456 → 9,46. El movimiento actual se queda con el resto. Las partes se marcan con `[Fraccionado i/n]` al final de la descripción y la app muestra una etiqueta "Fraccionado".
- **Saldo de las cuentas.** Viene del campo `balance` de la API, que el backend actualiza con cada gasto, ingreso, transferencia, ajuste o importación. La app lo vuelve a pedir tras cada operación, al volver a la app y cada 30 segundos. Editar el saldo de una cuenta crea un ajuste (`POST /accounts/:id/adjustments`) que queda en el historial.
- **Periodo.** Inicio, Transacciones, el historial de movimientos y la lista de una categoría comparten el mismo periodo: lo que eliges en una pantalla se mantiene en las demás mientras la app está abierta. Las semanas son las del mes, de lunes a domingo y recortadas al mes, así que un mes puede tener 4, 5 o 6. En Año no se muestra el intervalo de fechas.
- **Desglose en Inicio.** Una categoría sin subcategorías en el periodo abre directamente la pantalla de sus movimientos. Si tiene, muestra el gráfico de subcategorías y cada una abre su pantalla. Al volver, Inicio recuerda la pestaña y el nivel.
- **Gráfico de Inicio.** Forma parte del contenido desplazable, así que sube con el dedo sin saltos. Cuando sale de la vista, la cabecera de la lista, que queda fija arriba, muestra una barra resumen y el total. El botón de gráfico alterna entre anillo y barra, y se recuerda.
- **Sin rebote.** La página no se desplaza: solo lo hacen los contenedores de lista, sin efecto rebote. Arrastrar sobre una zona sin scroll no mueve la pantalla.
- **Cuenta por defecto.** El botón + abre un movimiento nuevo con la cuenta elegida en Inicio. Si está en "Total", usa la primera.
- **Pantallas con lista.** En Transacciones, Cuentas, Categorías, el historial y la lista de una categoría, la cabecera es fija y solo la lista se desplaza. El formulario de movimiento no tiene scroll: en pantallas bajas oculta las etiquetas de los campos.
- **Buscador.** Los selectores de categoría y subcategoría filtran por nombre, sin distinguir tildes ni mayúsculas.
- **Tipo de categoría.** Viene de la API (`type`: EXPENSE o INCOME) y las subcategorías lo heredan. El backend rechaza un movimiento cuyo tipo no coincide con el de su categoría, y no deja cambiar el tipo de una categoría que ya tiene movimientos. Al crear una subcategoría la app le asigna un tono degradado del color de la categoría, que la API exige.
- **Registro.** La API exige `name`. La app usa la parte del email anterior a la arroba.
- **Iconos.** Se guardan como claves cortas (`utensils`, `card`, `bag`…), porque la API admite como máximo 10 caracteres. Los iconos emoji antiguos se traducen automáticamente.
- **Zoom.** Está desactivado: viewport sin escalado, `touch-action: manipulation` y bloqueo del gesto de pellizco en iOS. Los campos de texto usan 16 px para que iOS no amplíe al enfocarlos.
