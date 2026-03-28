'use client'

import { Landmark } from 'lucide-react'
import AccountList from '@/components/AccountList'
import FlashBanner from '@/components/FlashBanner'
import { usePathname, useRouter } from '@/navigation'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'

export default function AccountsPage() {
  const tAccounts = useTranslations('accounts')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const flash = searchParams.get('flash')
  const flashMessage = flash === 'account-updated' ? tAccounts('accountUpdated') : null

  return (
    <div className="space-y-6">
      {flashMessage ? (
        <FlashBanner message={flashMessage} onDone={() => router.replace(pathname)} />
      ) : null}
      <div className="rounded-[32px] border border-white/80 bg-white/70 p-6 shadow-[0_18px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{tAccounts('title')}</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{tAccounts('title')}</h1>
            <p className="mt-2 text-sm text-slate-500">{tAccounts('totalAccounts')}</p>
          </div>
        </div>
      </div>
      <AccountList />
    </div>
  )
}
