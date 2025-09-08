# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

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
yarn exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
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

### 1. 빌드 오류 해결
- **원인**: `login` 및 `register` 페이지에서 `AuthProviderClient`를 import하는 상대 경로가 잘못 지정되어 있었습니다. (`../../` -> `../`)
- **해결**: `apps/web/app/login/page.tsx`와 `apps/web/app/register/page.tsx` 파일의 import 경로를 올바르게 수정했습니다.

### 2. 런타임 데이터 로딩 오류 해결
- **증상**: 로그인 후 모든 데이터 관련 페이지에서 "Error loading data" 메시지 발생.
- **원인 분석**:
    1. 프론트엔드 API 호출 (`/api/accounts`)이 500 에러를 반환.
    2. 백엔드 API 핸들러에서 `prisma.account.findMany()` 실행 실패 확인.
    3. 근본 원인은 데이터베이스 연결 또는 테이블 부재로 추정.

### 3. 데이터베이스 설정 및 초기화
- **1단계: DB 연결 오류 (Prisma P1001)**: `prisma db push` 실행 시 원격 Supabase 데이터베이스에 접속하지 못하는 문제가 발생했습니다. 이는 Supabase 프로젝트의 비활성화, 방화벽, 또는 잘못된 인증 정보 때문일 수 있습니다. (사용자가 외부에서 해결)
- **2단계: DB 스키마 적용**: DB 연결이 정상화된 후, `npx prisma db push` 명령을 통해 `schema.prisma`에 정의된 테이블들을 데이터베이스에 생성했습니다.
- **3단계: 데이터 시딩(Seeding)**:
    - `package.json`의 `seed` 스크립트가 존재하지 않는 `seed.ts`를 가리키는 오류를 발견하여, 실제 파일인 `seed.js`를 사용하도록 수정했습니다. (`"seed": "node prisma/seed.js"`)
    - `npm run seed` 명령을 실행하여 초기 데이터를 데이터베이스에 성공적으로 채웠습니다.

위 과정을 통해 모든 문제가 해결되었고 애플리케이션이 정상적으로 동작함을 확인했습니다.