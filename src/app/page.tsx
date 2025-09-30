'use client'

import { Hero } from '@/components/home/Hero'
import { EmergencyBanner } from '@/components/home/EmergencyBanner'
import { ServiceCategories } from '@/components/home/ServiceCategories'
import { HowItWorks } from '@/components/home/HowItWorks'
import { WhyChooseUs } from '@/components/home/WhyChooseUs'
import { Testimonials } from '@/components/home/Testimonials'
import { PricingSection } from '@/components/home/PricingSection'
import { CTASection } from '@/components/home/CTASection'

export default function HomePage() {
  return (
    <>
      <EmergencyBanner />
      <Hero />
      <ServiceCategories />
      <HowItWorks />
      <WhyChooseUs />
      <PricingSection />
      <Testimonials />
      <CTASection />
    </>
  )
}