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

### 4. 추가 수정 및 개선 (Additional Fixes and Improvements)

- **Hydration 오류 수정**:
  - **증상**: `In HTML, whitespace text nodes cannot be a child of <tr>.` 오류가 콘솔에 계속 발생.
  - **원인**: `<table>`의 `<thead>`와 `<tbody>` 태그 사이에 줄바꿈(whitespace)이 있어 React 렌더링 시 hydration 불일치 발생.
  - **해결**: `AccountList.tsx`, `HoldingsList.tsx`, `TransactionList.tsx` 파일에서 `<thead>`와 `<tbody>` 사이의 공백을 제거하여 해결.

- **트랜잭션 생성 로직 개선**:
  - **증상**: 새 트랜잭션을 추가해도 계좌(Account)의 잔액이 업데이트되지 않음.
  - **원인**: API 라우트 (`/api/transactions`)가 트랜잭션 레코드만 생성하고, 연결된 계좌의 잔액을 수정하지 않았음.
  - **해결**: `prisma.$transaction`을 사용하여 트랜잭션 생성과 계좌 잔액 업데이트가 원자적(atomic)으로 동시에 일어나도록 API 로직을 수정.

- **트랜잭션 폼 기능 개선**:
  - **요구사항**: 트랜잭션 추가 시, 선택된 계좌의 통화(currency)가 자동으로 폼에 설정되고 변경 불가능하도록 수정.
  - **해결**: `TransactionForm.tsx`에서 계좌 선택 시 해당 계좌의 통화를 읽어와 `currency` 필드를 자동으로 채우고 `readOnly` 속성을 추가함.

- **API 권한 오류 수정**:
  - **증상**: 트랜잭션 추가 시 `Error: Unauthorized` 오류 발생.
  - **원인**: API가 현재 로그인한 사용자의 계좌만 필터링하지 않고, 모든 사용자의 계좌 목록을 불러오고 있었음. 이로 인해 다른 사용자의 계좌에 트랜잭션을 추가하려는 시도가 발생하여 권한 오류로 이어짐.
  - **해결**: `GET /api/accounts` API 라우트에 현재 로그인한 사용자의 `userId`로 필터링하는 로직을 추가하여, 사용자가 자신의 계좌만 보고 상호작용할 수 있도록 수정.

- **개발 환경 가이드**:
  - **문제**: Supabase의 이메일 인증 기능 때문에 테스트용 계정 생성이 어려움.
  - **해결**: Supabase 대시보드에서 일시적으로 이메일 인증 기능을 비활성화하는 방법을 안내하여 원활한 테스트 환경을 구축하도록 지원.
