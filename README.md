# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## 🚀 Getting Started

Follow these steps to set up and run the financial application:

### 1. Install Dependencies

Ensure you have Node.js (>=18) and npm (or yarn/pnpm) installed. Then, install the project dependencies:

```bash
npm install
```

### 2. Configure Database Connection

This application uses **Supabase** for its PostgreSQL database. You need to provide your database connection string.

*   **Create a Supabase Project:** If you don't have one, create a project on [Supabase](https://supabase.com/).
*   **Get Your Database URL:**
    1.  Go to your Supabase project dashboard.
    2.  Navigate to **Database** > **Connection pooling**.
    3.  Copy the **PostgreSQL** connection string provided for **Prisma**. It will look something like:
        `postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`
*   **Create `.env` File:** In the project's root directory, create a file named `.env`.
*   **Add `DATABASE_URL`:** Paste your copied connection string into the `.env` file, like this:
    ```
    DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
    ```
    **Important:** Replace `[YOUR-PASSWORD]` with your actual Supabase database password. **The password is required in this `.env` file.** This file is typically `.gitignore`d for security reasons, so do not commit it to version control.
    For local development, you might also need to set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `apps/web/.env.local`.

### 3. Apply Database Migrations and Seed Data

After setting up your `.env` file, synchronize your database schema and populate it with initial data:

```bash
npx prisma migrate status # Verify database connection and migration status
npx prisma db seed        # Populate the database with initial data (uses upsert for safety)
npx prisma generate       # Ensure Prisma Client is up-to-date
```
*Note: If you are connecting to an existing Supabase database that is not empty, and encounter migration errors, please refer to the "Troubleshooting & Setup Log" section below for details on how to baseline the database.*


### 4. Run the Development Server

To start the application in development mode:

```bash
npm run dev
```

The `web` application should be accessible at `http://localhost:3000` and the `docs` application at `http://localhost:3001`.

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build
yarn dlx turbo build
pnpm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build --filter=docs

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build --filter=docs
yarn exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev
yarn exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev --filter=web

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev --filter=web
yarn exec turbo dev
pnpm exec turbo dev
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo login

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo login
yarn exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo link

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo link
yarn exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)

---

## 트러블슈팅 및 설정 기록 (Troubleshooting & Setup Log)

이 프로젝트를 처음 설정하고 실행하는 과정에서 몇 가지 문제가 발생하여 아래와 같이 해결했습니다.

### 1. Supabase 환경 변수 설정

-   **문제**: `web` 애플리케이션이 `NEXT_PUBLIC_SUPABASE_URL` 및 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 환경 변수를 찾지 못하거나 `Invalid URL` 오류가 발생했습니다.
-   **원인**: `apps/web/.env.local` 파일에 해당 변수들이 누락되거나 임시 값으로 설정되어 있었습니다.
-   **해결**: `apps/web/.env.local` 파일에 실제 Supabase 프로젝트 URL과 Anon Key를 추가했습니다.

### 2. `cookies().get()` `await` 누락 오류

-   **문제**: `cookies().get()` 호출 시 `await` 키워드가 누락되어 `cookies() should be awaited before using its value` 오류가 발생했습니다.
-   **원인**: Next.js API 라우트에서 `cookies()` 함수를 비동기적으로 호출해야 하는데 동기적으로 호출하고 있었습니다.
-   **해결**: 관련 API 라우트 파일(`accounts/[id]/route.ts`, `accounts/[id]/transactions/route.ts`, `accounts/route.ts`, `holdings/route.ts`, `transactions/route.ts`)에서 `const cookieStore = cookies()`를 `const cookieStore = await cookies()`로 수정했습니다.

### 3. `DATABASE_URL` 설정 및 Prisma 연결 문제

-   **문제**: `P1001: Can't reach database server` 오류가 발생하거나 데이터 로딩이 되지 않았습니다. `Invalid URL` 오류도 발생했습니다.
-   **원인**:
    *   `DATABASE_URL`이 임시 값으로 설정되어 있거나, 직접 연결 URL이 IPv4/IPv6 호환성 문제로 인해 연결되지 않았습니다.
    *   Prisma가 `DATABASE_URL` 환경 변수를 `apps/web/.env.local`에서 올바르게 찾지 못했습니다.
-   **해결**:
    *   Supabase에서 제공하는 **세션 풀러 `DATABASE_URL`**을 사용했습니다.
    *   Prisma가 환경 변수를 올바르게 인식하도록 `DATABASE_URL`을 `finance-app/.env` (루트 디렉토리)로 이동했습니다.
    *   `[YOUR-PASSWORD]`를 실제 데이터베이스 비밀번호로 교체했습니다.
    *   `ping` 테스트를 통해 네트워크 연결을 확인했습니다.

### 4. Prisma 마이그레이션 및 초기 데이터 설정 문제 해결

-   **문제**: 데이터 로딩 오류 (`GET /api/... 500`)가 발생하고, `prisma/migrations`에 마이그레이션 파일이 없거나, 비어있지 않은 데이터베이스에 `npx prisma migrate deploy` 명령 실행 시 `P3005` 오류가 발생했습니다. 또한, `Prisma Client did not initialize yet` 오류가 발생했습니다.
-   **원인**: 데이터베이스 스키마가 적용되지 않았거나 초기 데이터가 없었고, Prisma Client 초기화 로직에 문제가 있었습니다. 특히 기존 Supabase DB에 연결할 때 Prisma의 마이그레이션 기록이 없어 충돌이 발생했습니다.
-   **해결**:
    *   **Prisma Client 초기화 로직 수정**: `lib/prisma.ts` 파일의 `PrismaClient` 초기화 로직을 Next.js 환경에 더 적합하고 안정적인 싱글톤 패턴으로 업데이트하여 `Prisma Client did not initialize yet` 오류를 해결했습니다.
    *   **데이터베이스 베이스라인 설정**: 비어있지 않은 기존 Supabase 데이터베이스에 연결하기 위해 다음 단계를 통해 데이터베이스를 베이스라인으로 설정했습니다.
        1.  `prisma/migrations/0_init` 디렉토리를 수동으로 생성했습니다.
        2.  `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql` 명령을 사용하여 현재 `schema.prisma`의 SQL 스키마를 `migration.sql` 파일로 추출했습니다.
        3.  `npx prisma migrate resolve --applied 0_init` 명령을 사용하여 이 수동 생성된 `0_init` 마이그레이션이 데이터베이스에 이미 적용된 것으로 Prisma에게 알려주었습니다.
    *   **초기 데이터 시딩**: `npx prisma db seed` 명령을 실행하여 데이터베이스에 초기 데이터를 채웠습니다. (`upsert` 로직 덕분에 기존 데이터 손실 없이 안전하게 실행됨).
    *   **Prisma Client 재생성**: `npx prisma generate` 명령을 실행하여 최신 스키마를 반영한 Prisma Client를 재생성했습니다.

위 과정을 통해 모든 문제가 해결되었고 애플리케이션이 정상적으로 동작함을 확인했습니다.

## 🚀 Getting Started (New Setup Guide)

### 1. Clone the Repository

```bash
git clone https://github.com/apt777/finance-app.git
cd finance-app
```

### 2. Configure Environment Variables

Create a file named `.env.local` in the root directory and copy the contents of `.env.example` into it.

```bash
cp .env.example .env.local
```

Fill in the required values from your Supabase project:

| Variable | Description | Source |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | Supabase Settings -> API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key | Supabase Settings -> API |
| `DATABASE_URL` | Your full PostgreSQL connection string | Supabase Settings -> Database -> Connection String (URI) |

### 3. Install Dependencies and Setup Database

Use the provided setup script to install dependencies, push the database schema, and seed initial data.

```bash
npm install
npm run setup
# This runs: npx prisma db push && npm run seed
```

**Note:** `npm run setup` will automatically create the necessary tables (`Currency`, `AccountType`, `TransactionCategory`) and populate them with initial data (JPY, KRW, USD, etc.).

### 4. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 🛠️ Database Management

This project uses **Prisma** for database management, connected to **Supabase** (PostgreSQL).

### Schema Updates

If you modify `prisma/schema.prisma`:

1.  **Generate Migration SQL**:
    ```bash
    npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/$(date +%Y%m%d%H%M%S)_new_migration.sql
    ```
2.  **Apply to Local DB (for testing)**:
    ```bash
    npx prisma db push
    ```
3.  **Apply to Remote Supabase DB**:
    *   Use the Supabase CLI to link your project: `npx supabase link --project-ref <YOUR_PROJECT_ID>`
    *   Apply the migration: `npx supabase migration up`

### Seeding

To re-run the initial data seeding (currencies, account types, categories):

```bash
npm run seed
```

## 🌐 Multi-Currency & Investment Features

The database schema is optimized for:

*   **Multi-Currency**: Tracking assets and transactions in JPY, KRW, USD, etc.
*   **NISA**: Dedicated model for tracking NISA account limits.
*   **Investment**: Detailed tracking of stock holdings, cost basis, and region.
*   **Web Setup**: Initial setup is now handled via a user-friendly web interface (`/setup`), eliminating the need for manual CSV imports.
