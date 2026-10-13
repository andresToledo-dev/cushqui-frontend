# Cushqui

App web y móvil para gestionar gastos diarios, cuentas y categorías. Hecha con Next.js 16, React 19 y Tailwind CSS 4, en modo oscuro.

## Puesta en marcha

1. Arranca el backend de Cushqui en `http://localhost:3000`.
2. Instala dependencias y arranca el frontend en otro puerto:

```bash
npm install
npm run dev -- -p 3001
```

3. Abre http://localhost:3001 y regístrate.

La URL de la API se configura en `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

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
