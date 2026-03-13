'use client'

import OverviewClassic from '@/components/OverviewClassic'
import OverviewModern from '@/components/OverviewModern'
import { useUiTheme } from '@/context/UiThemeContext'

export default function Overview() {
  const { theme } = useUiTheme()

  return theme === 'old' ? <OverviewClassic /> : <OverviewModern />
}
