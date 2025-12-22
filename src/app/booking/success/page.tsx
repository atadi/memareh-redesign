"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BookingSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to articles since booking flow has been removed
    router.replace('/articles')
  }, [router])

  return null
}
