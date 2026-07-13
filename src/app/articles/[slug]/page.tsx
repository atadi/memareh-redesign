import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/server-public";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { CommentSection } from "@/components/articles/CommentSection";
import { RelatedArticles } from "@/components/articles/RelatedArticles";

export const revalidate = 300;

export async function generateStaticParams() {
  const adminClient = createSupabaseAdmin();
  const { data } = await adminClient
    .from("articles")
    .select("slug")
    .eq("status", "published");
  return (data ?? []).map((a) => ({ slug: a.slug }));
}

const siteUrl = "https://www.memareh.com";

// -----------------------------
// Metadata SEO
// -----------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: article } = await supabase
    .from("articles")
    .select("title, excerpt, featured_image, published_at, updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!article) {
    return {
      title: "مقاله پیدا نشد | معماره",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const articleUrl = `${siteUrl}/articles/${slug}`;
  const image =
    article.featured_image || `${siteUrl}/assets/logo/cover-image.jpg`;

  return {
    title: article.title,
    description: article.excerpt,
    metadataBase: new URL(siteUrl),

    alternates: {
      canonical: articleUrl,
    },

    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: articleUrl,
      siteName: "معماره",
      locale: "fa_IR",
      type: "article",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
    },

    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [image],
    },

    robots: {
      index: true,
      follow: true,
    },
  };
}

// -----------------------------
// Page
// -----------------------------
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !article) {
    notFound();
  }

  const { data: commentRows } = await supabase
    .from("article_comments")
    .select("*")
    .eq("article_id", article.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  // Resolve comment author names from profiles + admin check
  const userIds = [...new Set((commentRows ?? []).map((c: any) => c.user_id).filter(Boolean))]

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds)
  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p: any) => [p.id, p]),
  )

  const { data: adminCheck } = await supabase
    .rpc("check_admin_users", { user_ids: userIds })
  const adminMap = Object.fromEntries(
    (adminCheck ?? []).filter((a: any) => a.is_admin).map((a: any) => [a.user_id, true]),
  )

  const comments = (commentRows ?? []).map((c: any) => {
    let full_name: string
    if (c.user_id) {
      full_name = profileMap[c.user_id]?.display_name
        || (adminMap[c.user_id] ? "گروه معماره" : "کاربر")
    } else {
      full_name = c.guest_name?.trim() || "کاربر مهمان"
    }

    return {
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      parent_id: c.parent_id,
      user: {
        full_name,
      },
      like_count: 0,
      is_pinned: false,
      replies: [],
    }
  });

  const articleUrl = `${siteUrl}/articles/${slug}`;
  const image =
    article.featured_image || `${siteUrl}/assets/logo/cover-image.jpg`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image,
    url: articleUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    author: {
      "@type": "Organization",
      name: "معماره",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "معماره",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/assets/logo/logo-square.svg`,
      },
    },
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    inLanguage: "fa-IR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <article className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-6 py-10 bg-white">
          {article.featured_image && (
            <img
              src={article.featured_image}
              alt={article.title}
              className="w-full rounded-xl mb-8"
            />
          )}

          <div
            className="prose prose-lg max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </main>

        <section className="max-w-4xl mx-auto px-6 py-10">
          <RelatedArticles
            currentArticleId={article.id}
            category={article.category}
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 py-10">
          <CommentSection
            articleId={article.id}
            comments={comments}
            allowComments={article.allow_comments ?? true}
          />
        </section>
      </article>
    </>
  );
}
