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

## Fuera de alcance por ahora

- Importador ONIX (archivo de ~7 GB).
- Modelo de catálogo y datos (`schema.prisma` aún no tiene modelos).
- Precios y margen del 20 %.
- Autenticación, carrito, checkout y panel de administración.
- Despliegues (AWS u otros).
