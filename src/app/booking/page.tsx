"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BookingPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect booking route to articles (booking removed)
    router.replace('/articles')
  }, [router])

  return null
}
