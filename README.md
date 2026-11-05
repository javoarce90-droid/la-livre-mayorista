# La Livre

Catálogo mayorista de libros. Este repositorio es el andamiaje inicial: un monorepo pnpm con una web (Next.js) y una API (NestJS + Prisma) preparada para conectarse a Supabase (PostgreSQL) cuando haya credenciales.

## Estructura

```
apps/
  web/   @la-livre/web  · Next.js (App Router). Sin acceso a base de datos.
  api/   @la-livre/api  · NestJS + Prisma. GET /health no depende de la base de datos.
```

## Stack y versiones

| Pieza | Versión | Notas |
| --- | --- | --- |
| Node.js | 24 (`.nvmrc`), mínimo 22.13 | |
| pnpm | 11.5.2 (`packageManager`) | Los build scripts permitidos se declaran en `pnpm-workspace.yaml` (`allowBuilds`). |
| Next.js / React | 16.3 / 19.2 | Next 16 eliminó `next lint`: se usa la CLI de ESLint 9 con `eslint-config-next`. |
| NestJS | 12 | Proyecto ESM, tests con Vitest y lint con oxlint (lo que genera la CLI de Nest 12). |
| Prisma | 7.10 (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) | Ver abajo. |
| TypeScript | ~6.0 en todo el repo | TypeScript 7 rompe `nest build` (la CLI de Nest 12 depende de TS ~6.0). |

**¿Por qué Prisma 7 y no 8?** El tag `latest` de npm apunta a `8.0.0-rc`, una prerelease que todavía no trae `migrate`/`generate` completos. Prisma 7 es la última versión estable. En Prisma 7:

- La URL de conexión vive en `apps/api/prisma.config.ts`, no en `schema.prisma`.
- El cliente se genera en `apps/api/src/generated/prisma` (ignorado por git) y se regenera en `postinstall`, `build`, `typecheck` y `test`.
- En runtime es obligatorio el driver adapter (`@prisma/adapter-pg`).

## Requisitos

- Node.js 24 (`nvm use`)
- pnpm 11 (`corepack enable`)

## Instalación

```bash
pnpm install
```

No hace falta ningún `.env` para instalar, compilar, testear ni arrancar la API.

## Ejecutar

```bash
pnpm dev        # web (http://localhost:3000) y api (http://localhost:3001) en paralelo
pnpm dev:web    # solo la web
pnpm dev:api    # solo la API
```

Comprobar la API: `curl http://localhost:3001/health` → `{"status":"ok"}`.

## Verificación

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check                              # todo lo anterior en orden
pnpm --filter @la-livre/api db:validate # valida el schema de Prisma
```

## Conectar Supabase (cuando haya credenciales)

1. Crear el proyecto en Supabase.
2. Opcional (recomendado): crear un rol de base de datos dedicado `prisma` en lugar de usar `postgres`.
3. Copiar `apps/api/.env.example` a `apps/api/.env` y completar:
   - `DATABASE_URL`: cadena del **session pooler** (Supavisor, puerto 5432). La API es un proceso de larga duración, así que no se usa el transaction pooler (6543), pensado para serverless.
   - `DIRECT_URL`: conexión **directa** (o el mismo session pooler en 5432). La usa Prisma CLI para las migraciones.
4. Ejecutar `pnpm db:migrate` (desarrollo) o `pnpm db:deploy` (aplicar migraciones existentes).

Las credenciales solo van en `apps/api/.env`, nunca en la web ni en variables `NEXT_PUBLIC_*`. El `.env` está ignorado por git.

## Importar catálogo ONIX (muestra)

El importador lee el ONIX 3.0 de Azeta en streaming (directamente del `.zip`, sin descomprimirlo a disco y con memoria constante) y escribe en la base de datos por lotes de 500 productos, cada lote en una transacción.

```bash
# Simulación: analiza y selecciona, muestra un resumen y 3 productos de ejemplo. No toca la base de datos.
pnpm import:onix -- --file ~/Escritorio/Azeta_Catalogo_ONIX.zip --limit 1000 --include-publisher DEBOLSILLO --dry-run

# Importación real (requiere DATABASE_URL en apps/api/.env)
pnpm import:onix -- --file ~/Escritorio/Azeta_Catalogo_ONIX.zip --limit 1000 --include-publisher DEBOLSILLO
```

- `--limit N`: los primeros N productos (en el orden del archivo) de editoriales que no estén en `--include-publisher`.
- `--include-publisher NOMBRE`: todos los productos de esa editorial (nombre exacto de `PublisherName`, sin distinguir mayúsculas). Se puede repetir. Si se usa sin `--limit`, solo se importan esas editoriales.
- `--configured-publishers`: añade a `--include-publisher` todas las variantes de nombre de las editoriales configuradas con descuento (`apps/api/src/catalog-import/domain/publisher-discounts.ts`), es decir, las que se venden.
- Sin `--limit` ni `--include-publisher` se importa el catálogo completo.
- `--dry-run`: no se conecta a la base de datos. `--batch-size N` cambia el tamaño de lote.

Con `--include-publisher` hay que recorrer el archivo entero (~1,1 millones de productos, alrededor de un minuto); con solo `--limit` la lectura se detiene al alcanzar el límite. Volver a importar es idempotente: actualiza libros y ofertas, reemplaza los colaboradores y nunca sobrescribe el descuento del proveedor, las reglas de precio existentes, el coste neto ni el precio de venta manual.

La marca (`brand`) y el descuento por editorial (`listPriceDiscountPercent`) siguen siempre la configuración versionada: el importador los fija al crear o actualizar cada editorial. Para aplicarlos a las editoriales ya importadas sin reimportar:

```bash
pnpm catalog:apply-discounts
```

## Precios y tipo de cambio

El precio al cliente se calcula al leer el catálogo (nunca se guarda): **precio de venta (EUR) = precio de lista sin IVA × (1 + porcentaje de la regla activa / 100)**, o el precio manual (`salePriceOverride`) si existe; luego **ARS = EUR × tipo de cambio**, redondeado a centavos. El porcentaje puede ser negativo (rebaja) o positivo (recargo); con 0 se vende al precio de lista sin IVA. El coste (`netCostAmount`, o lista sin IVA menos el descuento de la editorial o del proveedor) solo sirve para calcular el margen interno y nunca se envía a la web.

Ejemplo: lista 10,00 € sin IVA, Debolsillo 35 %, regla 0 %, cambio 1738 → venta $ 17.380,00; coste $ 11.297,00; margen $ 6.083,00.

Solo se muestran los libros de editoriales con descuento configurado, con una oferta disponible de inmediato (ONIX lista 65: `20` disponible o `21` en stock) y con precio de lista sin IVA (o precio manual). Si no hay tipo de cambio cargado, la API responde 503 (`exchange_rate_missing`) en lugar de mostrar precios en euros.

```bash
# Tipo de cambio (se guarda el historial; rige el último). Por defecto EUR → ARS.
pnpm pricing:set-rate -- --rate 1738
pnpm pricing:set-rate -- --rate 1738.50 --from EUR --to ARS

# Regla de precio activa ('default'). Bases: ADJUSTMENT_ON_LIST_PRICE, MARKUP_ON_COST, MARGIN_ON_PRICE.
pnpm pricing:set-rule -- --basis ADJUSTMENT_ON_LIST_PRICE --percent 0
pnpm pricing:set-rule -- --basis ADJUSTMENT_ON_LIST_PRICE --percent -5
```

Ambos comandos requieren `DATABASE_URL` en `apps/api/.env` e imprimen el valor guardado.

## API del catálogo

Rutas internas (las consume solo el servidor de la web), protegidas con `Authorization: Bearer <API_INTERNAL_TOKEN>`. Si `API_INTERNAL_TOKEN` no está definida, en desarrollo se permite el acceso (con un aviso) y en producción la API responde 503.

- `GET /catalog/books?q=&author=&publisher=&offset=&limit=` → `{ items, total }`, ordenado por título. `q` busca en título, autores, ISBN y editorial; todas las palabras deben aparecer (sin distinguir mayúsculas ni acentos). `limit` por defecto 20, máximo 100.
- `GET /catalog/books/:isbn` → un libro o 404.
- `GET /catalog/facets` → `{ publishers }`.

Cada libro trae `priceCents` (entero, centavos de ARS), `currency` (`ARS`) y `priceUpdatedAt` (fecha del feed del proveedor).

## Front: portal de clientes

Primera pasada del portal para librerías en `apps/web` (Next.js 16, Tailwind CSS v4). **El catálogo viene de la API** cuando `API_INTERNAL_URL` está definida (en Vercel la inyecta el service binding; en local, `http://localhost:3001`) junto con `API_INTERNAL_TOKEN`; si no, se usan los libros semilla. El resto sigue mockeado. Ver `apps/web/.env.example`.

**Credenciales demo** (se muestran en el login en desarrollo): `demo@lalivre.com` / `lalivre123`.

Pantallas: Login, Dashboard, Libros (buscador + ficha del libro), Pedido (consulta/edición, importación CSV). El resto de las secciones del menú muestran "Próximamente".

Qué está mockeado y dónde:

- **Usuarios**: un único usuario demo (`modules/auth/infrastructure/in-memory-user-directory.ts`). La sesión es una cookie httpOnly firmada con HMAC; en producción definir `SESSION_SECRET`.
- **Catálogo**: API real (`modules/catalog/infrastructure/api-catalog-repository.ts`, revalidación de 60 s) o, sin `API_INTERNAL_URL`, ~60 libros semilla en memoria (`seed-books.ts`). Con datos reales no hay materia, edad recomendada ni promociones y todo está disponible, así que esos filtros, columnas y filas de la ficha se ocultan solos. Los atajos posicionales heredados (TCASA, EANAG) se resuelven como "contiene".
- **Pedido**: en memoria del proceso, por cuenta; se reinicia al reiniciar el servidor. Arranca con un pedido de ejemplo (vacío cuando se usa la API, porque el ejemplo apunta a libros semilla).
- **Cuenta** (saldo, actividad, consignaciones, ventas): `modules/account/infrastructure/mock-account-repository.ts`.
- **Descargas PDF/XLS** y "Notificarme cuando ingrese": solo muestran un aviso.
- **Importar pedido**: solo `.csv` (sin encabezados; columna A ISBN, columna B cantidad). `.xlsx` queda pendiente.

Variables para previsualizar estados de la cuenta mock (en `apps/web/.env.local`):

| Variable | Efecto |
| --- | --- |
| `LALIVRE_MOCK_ZONE=AMBA` | Zona de entrega AMBA (por defecto Interior) |
| `LALIVRE_MOCK_SUSPENDED=1` | Cuenta suspendida: no se pueden agregar productos |
| `LALIVRE_MOCK_ORDER_LOCKED=1` | Pedido bloqueado |
| `LALIVRE_MOCK_NO_PROMOTIONS=1` | Oculta "Promociones" del menú |
| `LALIVRE_MOCK_NO_CONSIGNMENT=1` | Oculta la tarjeta de consignaciones |

Arquitectura: `src/modules/{auth,catalog,order,account}/{domain,application,infrastructure,ui}`; `src/composition.ts` es el único lugar que conecta los adaptadores mock, así que pasar a la API real solo toca `infrastructure/` y ese archivo. `src/proxy.ts` (ex-middleware) hace el chequeo optimista de sesión.

## Fuera de alcance por ahora

- Modelo de catálogo y datos (`schema.prisma` aún no tiene modelos).
- Precios y margen del 20 %.
- Autenticación real, checkout y panel de administración (el portal usa auth y pedido mock, ver arriba).
- Despliegues (AWS u otros).
