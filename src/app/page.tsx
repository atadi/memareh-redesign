import { Hero } from '@/components/home/Hero'
import { HowItWorks } from '@/components/home/HowItWorks'
import { WhyChooseUs } from '@/components/home/WhyChooseUs'
import { Testimonials } from '@/components/home/Testimonials'
import { CTASection } from '@/components/home/CTASection'
import { LatestArticles } from '@/components/home/LatestArticles'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 300

export default async function HomePage() {
  const supabase = await createClient()

  const { data: rawArticles } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(3)

  const articles = (rawArticles ?? [])
    .filter(a => a.slug && a.slug !== 'null')
    .map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt || '',
      featured_image: a.featured_image,
      category: a.category || '',
      view_count: a.view_count || 0,
      reading_time: a.reading_time,
      published_at: a.published_at,
      author_name: a.author_name,
      averageRating: a.average_rating,
      ratingCount: a.rating_count,
      _count: a._count,
    }))

  return (
    <>
      <Hero />
      <HowItWorks />
      <WhyChooseUs />
      <Testimonials />

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <LatestArticles articles={articles} />
        </div>
      </section>

      <CTASection />
    </>
  )
}
