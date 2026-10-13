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

En local no hace falta configurar la URL de la API. El navegador llama a `/api/v1` y Next la reenvía al backend (`BACKEND_URL`, por defecto `http://localhost:3000`). Ver `.env.example`.

## Probar en el teléfono

- **En el navegador:** con el teléfono en la misma Wi-Fi, abre `http://<IP-del-PC>:3001`. Next acepta automáticamente las IPs de la red local.
- **Como app instalada (PWA):** instalar exige HTTPS. Instala cloudflared una vez (`winget install Cloudflare.cloudflared`) y, con `npm run dev` corriendo, ejecuta `npm run tunnel`. Abre en el teléfono la URL `https://….trycloudflare.com` que aparece y usa "Instalar app" o "Añadir a pantalla de inicio". Funciona con el backend local.
- **Rendimiento real:** `npm run build && npm start`. El modo `dev` es bastante más lento.

## Flujo de trabajo y despliegue

```
feature/* ──PR──▶ development ──PR──▶ main ──▶ Vercel (producción)
```

1. Crea la rama desde `development`: `git checkout development && git pull && git checkout -b feature/x`.
2. Prueba en local (ver arriba) y abre el PR: `gh pr create --base development`.
3. Para publicar: `gh pr create --head development --base main`. Al hacer merge, Vercel despliega producción.

- **CI** (`.github/workflows/ci.yml`): en cada PR a `development` o `main` ejecuta lint, typecheck y build.
- **Despliegues** (`vercel.json`): solo `main` despliega. El resto de ramas no genera previews.
- **Variables en Vercel** (entorno Production): `NEXT_PUBLIC_API_URL=https://<backend>/api/v1`. Con esta variable el navegador llama directamente al backend, que debe permitir el dominio de Vercel en CORS.

## PWA

- `src/app/manifest.ts`: nombre, colores y modo `standalone`, que abre la app sin la barra del navegador.
- `src/lib/app-icon.tsx`: el icono se genera por código. Lo usan `src/app/icons/[name]/route.tsx` (192, 512 y maskable), `src/app/apple-icon.tsx` y `src/app/icon.tsx`.
- No hay service worker: la app necesita conexión. Para modo offline se puede añadir [Serwist](https://github.com/serwist/serwist).

## Pantallas

| Ruta                                                                        | Pantalla                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `/login`, `/registro`                                                       | Acceso y registro (email y contraseña)                                    |
| `/`                                                                         | Inicio: balance, gráfico por categoría y subcategoría, selector de cuenta |
| `/transacciones`                                                            | Gastos, ingresos y movimientos por clasificar                             |
| `/transacciones/nueva`, `/transacciones/[id]`, `/transacciones/[id]/editar` | Alta, detalle y edición, con "Dividir cuenta"                             |
| `/cuentas`, `/cuentas/nueva`, `/cuentas/[id]`                               | Cuentas con icono, color y saldo                                          |
| `/cuentas/transferencias`                                                   | Historial de transferencias                                               |
| `/categorias`, `/categorias/nueva`, `/categorias/[id]`                      | Categorías y subcategorías                                                |

## Decisiones a tener en cuenta

- **Dividir cuenta.** Cada parte se redondea hacia arriba al céntimo. Si los céntimos acaban en 8 o 9, se sube a la décima siguiente: 6,4816 → 6,50, 9,98 → 10,00 y 9,456 → 9,46. El movimiento actual se queda con el resto. Las partes se marcan con `[Fraccionado i/n]` al final de la descripción y la app muestra una etiqueta "Fraccionado".
- **Saldo de las cuentas.** Se calcula en el frontend como saldo inicial más ingresos, menos gastos, más o menos transferencias. El `currentBalance` de la API no es fiable tras editar una cuenta (ver abajo).
- **Tipo de categoría.** La API no distingue categorías de gasto e ingreso. El tipo se guarda en el `localStorage` del navegador. Por defecto todas son de gasto, salvo nombres como "Nómina" o "Salario".
- **Registro.** La API exige `name`. La app usa la parte del email anterior a la arroba.
- **Iconos.** Se guardan como claves cortas (`utensils`, `card`, `bag`…), porque la API admite como máximo 10 caracteres. Los iconos emoji antiguos se traducen automáticamente.

## Problema conocido del backend

En `UpdateAccountDto`, `PartialType(CreateAccountDto)` hereda el valor por defecto `initialBalance = 0`. Además, `AccountsService.update` copia `initialBalance` en `currentBalance`. Cualquier PATCH a una cuenta reinicia así el saldo y descarta los movimientos. La corrección en el backend sería quitar el valor por defecto del DTO de actualización y recalcular el saldo en lugar de sobrescribirlo.
