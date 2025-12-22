'use client'

import { Hero } from '@/components/home/Hero'
import { EmergencyBanner } from '@/components/home/EmergencyBanner'
import Menu from '@/components/ui/Menu'
import { HowItWorks } from '@/components/home/HowItWorks'
import { WhyChooseUs } from '@/components/home/WhyChooseUs'
import { Testimonials } from '@/components/home/Testimonials'
import { CTASection } from '@/components/home/CTASection'
import { LatestArticles } from '@/components/home/LatestArticles'

export default function HomePage() {
  return (
    <>
      <EmergencyBanner />
      <div className="container mx-auto px-2 py-2">
        <Menu />
      </div>
      <Hero />
      <HowItWorks />
      <WhyChooseUs />
      <Testimonials />

      {/* Latest Articles Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <LatestArticles />
        </div>
      </section>

      <CTASection />
    </>
  )
}