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

## Alta de clientes

El portal es **solo por invitación**: únicamente pueden ingresar los clientes que da de alta La Livre (no hay registro público). Por ahora el alta la hace el equipo con la línea de comandos; la lógica vive en `apps/api/src/customers/application/customer-use-cases.ts` para reutilizarla en una futura pantalla de administración.

```bash
# Crea el cliente y le envía por email la invitación para elegir su contraseña.
# Si ya existía y todavía no aceptó, reenvía la invitación (sin cambiar sus datos).
pnpm customers:invite -- --email compras@libreria.com --name "Librería del Puerto" --tax-id 20-12345678-6 --phone "+54 11 5555-5555"

# Suspender: puede ingresar, pero no puede hacer pedidos. Reactivar.
pnpm customers:suspend -- --email compras@libreria.com
pnpm customers:activate -- --email compras@libreria.com

# Listado: estado, invitación (linked = vinculado a su usuario de Supabase / pending), email, razón social, CUIT, teléfono.
pnpm customers:list
```

- `--tax-id` (CUIT) es opcional; se aceptan guiones y se valida el dígito verificador. El email se guarda en minúsculas.
- Requieren en `apps/api/.env`: `DATABASE_URL`, y para invitar además `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (clave **secreta** `sb_secret_…`, nunca en la web) y `WEB_ORIGIN` (el link de la invitación apunta a `${WEB_ORIGIN}/auth/confirm?next=/cuenta/clave`).
- El cliente se guarda antes de invitar: si el envío falla (por ejemplo, por el límite de emails), alcanza con volver a correr el mismo comando.
- Si el email ya tiene contraseña en Supabase no se envía nada: el cliente puede ingresar o usar «¿Olvidaste tu contraseña?».

## Autenticación (Supabase Auth)

La web usa Supabase Auth (`@supabase/ssr`, sesión en cookies) cuando `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` están definidas en `apps/web`; si no, sigue funcionando el usuario demo en memoria (tests y desarrollo offline). Con Supabase, la cuenta del portal sale de la API `GET /me` (requiere `API_INTERNAL_URL`): la web envía el token interno y, en `X-Customer-Token`, el access token del usuario, que la API verifica con las claves públicas del proyecto (JWKS). Un usuario de Supabase sin cliente en La Livre es desconectado y ve «Tu usuario no tiene una cuenta habilitada. Escribinos a La Livre.».

Flujo: invitación por email → `/auth/confirm` → `/cuenta/clave` (elige su contraseña) → portal. Recuperación: «¿Olvidaste tu contraseña?» (`/login/olvide`, siempre responde lo mismo para no revelar qué emails existen) → email → `/auth/confirm` → `/cuenta/clave`.

**Configuración pendiente en el dashboard de Supabase** (proyecto `kgykaxaygbrhdtexlmnr`):

1. **Authentication → Sign In / Providers → Email**: desactivar **Allow new users to sign up** (solo invitación). Dejar habilitado el proveedor Email.
2. **Project Settings → JWT Keys**: el proyecto tiene que usar **claves de firma asimétricas** (ES256, el valor por defecto en proyectos nuevos). Con el secreto JWT heredado el JWKS viene vacío y la API rechaza todos los tokens.
3. **Authentication → URL Configuration**: *Site URL* = dominio de producción (por ejemplo `https://portal.lalivre.com.ar`). *Redirect URLs*: `http://localhost:3000/auth/confirm` y `https://<dominio-de-producción>/auth/confirm` (o `/**`).
4. **Authentication → Emails → Templates**, cambiar el enlace para que use `token_hash` (como recomienda la guía de SSR) en lugar de `{{ .ConfirmationURL }}`:
   - *Invite user*: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/cuenta/clave">Aceptar invitación</a>`
   - *Reset password*: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/cuenta/clave">Elegir una contraseña nueva</a>`
   - Traducir asunto y texto al español. `{{ .SiteURL }}` sale de la *Site URL*: para probar en local con estas plantillas, la Site URL tiene que ser `http://localhost:3000` (o usar un proyecto de desarrollo).
5. **SMTP**: el servidor de email incluido tiene un límite muy bajo de envíos por hora y es solo para pruebas. Para producción configurar un **SMTP propio** (Authentication → Emails → SMTP Settings).
6. Copiar *Project URL* y la clave **publishable** a `apps/web` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), y *Project URL* + clave **secret** a `apps/api` (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`).
7. Aplicar la migración `20261105140000_customers` (`pnpm db:deploy`).

## API del catálogo

Rutas internas (las consume solo el servidor de la web), protegidas con `Authorization: Bearer <API_INTERNAL_TOKEN>`. Si `API_INTERNAL_TOKEN` no está definida, en desarrollo se permite el acceso (con un aviso) y en producción la API responde 503.

- `GET /catalog/books?q=&author=&publisher=&offset=&limit=` → `{ items, total }`, ordenado por título. `q` busca en título, autores, ISBN y editorial; todas las palabras deben aparecer (sin distinguir mayúsculas ni acentos). `limit` por defecto 20, máximo 100.
- `GET /catalog/books/:isbn` → un libro o 404.
- `GET /catalog/facets` → `{ publishers }`.

- `GET /me` → el cliente del usuario que inició sesión: `{ id, email, businessName, taxId, phone, status }` (`ACTIVE` | `SUSPENDED`). Además del token interno requiere `X-Customer-Token: <access token de Supabase>` (verificado con el JWKS de `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, emisor `${SUPABASE_URL}/auth/v1`, audiencia `authenticated`). 401 `invalid_customer_token` si falta o no es válido; 403 `customer_not_found` si el usuario no es cliente de La Livre.

Cada libro trae `priceCents` (entero, centavos de ARS), `currency` (`ARS`) y `priceUpdatedAt` (fecha del feed del proveedor).

## Front: portal de clientes

Primera pasada del portal para librerías en `apps/web` (Next.js 16, Tailwind CSS v4). **El catálogo viene de la API** cuando `API_INTERNAL_URL` está definida (en Vercel la inyecta el service binding; en local, `http://localhost:3001`) junto con `API_INTERNAL_TOKEN`; si no, se usan los libros semilla. El resto sigue mockeado. Ver `apps/web/.env.example`.

**Credenciales demo** (se muestran en el login en desarrollo): `demo@lalivre.com` / `lalivre123`.

Pantallas: Login, Dashboard, Libros (buscador + ficha del libro), Pedido (consulta/edición, importación CSV). El resto de las secciones del menú muestran "Próximamente".

Qué está mockeado y dónde:

- **Usuarios**: Supabase Auth cuando está configurado (ver «Autenticación»). Sin Supabase, un único usuario demo (`modules/auth/infrastructure/in-memory-user-directory.ts`) con una cookie httpOnly firmada con HMAC (`SESSION_SECRET`).
- **Catálogo**: API real (`modules/catalog/infrastructure/api-catalog-repository.ts`, revalidación de 60 s) o, sin `API_INTERNAL_URL`, ~60 libros semilla en memoria (`seed-books.ts`). Con datos reales no hay materia, edad recomendada ni promociones y todo está disponible, así que esos filtros, columnas y filas de la ficha se ocultan solos. Los atajos posicionales heredados (TCASA, EANAG) se resuelven como "contiene".
- **Pedido**: en memoria del proceso, por cuenta; se reinicia al reiniciar el servidor. Arranca con un pedido de ejemplo (vacío cuando se usa la API, porque el ejemplo apunta a libros semilla).
- **Cuenta**: con Supabase, razón social, email y suspensión vienen de la API (`GET /me`); sucursal, depósito, rubro, zona (Interior), descuento (0 %), consignación, promociones y bloqueo de pedido todavía no tienen fuente y usan valores neutros. Saldo, actividad, consignaciones, ventas y notificaciones siguen mockeados (`modules/account/infrastructure/mock-account-repository.ts`).
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
- Checkout y panel de administración (el alta de clientes es por línea de comandos; el pedido sigue en memoria).
- Despliegues (AWS u otros).
