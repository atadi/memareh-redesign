'use client'

import { EmergencyBanner } from '@/components/home/EmergencyBanner'
import Menu from '@/components/ui/Menu'
import { usePathname } from 'next/navigation'

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  if (isAdmin) return <>{children}</>

  return (
    <>
      <EmergencyBanner />
      <div className="container mx-auto px-2 py-2">
        <Menu />
      </div>
      {children}
    </>
  )
}
