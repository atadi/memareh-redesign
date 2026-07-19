# Graph Report - .  (2026-07-19)

## Corpus Check
- Large corpus: 295 files · ~1,371,634 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 402 nodes · 495 edges · 76 communities (25 shown, 51 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Admin & Auth Pages
- Article Listings & Pages
- Build Toolchain
- TypeScript Configuration
- Article Editor & Sanitizer
- Path Aliases & Imports
- React Dependencies
- Import Path Mappings
- Layout & Theme Shell
- Admin User Management
- Data Types & Models
- Admin API Routes
- Image Processing
- Article Filters
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 73

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 38 edges
2. `compilerOptions` - 19 edges
3. `ArticleEditor()` - 10 edges
4. `createPublicClient()` - 8 edges
5. `createSupabaseAdmin()` - 7 edges
6. `paths` - 7 edges
7. `tailwind` - 6 edges
8. `aliases` - 6 edges
9. `revalidateArticle()` - 6 edges
10. `include` - 6 edges

## Surprising Connections (you probably didn't know these)
- `ArticleEditor()` --references--> `dompurify`  [EXTRACTED]
  src/components/admin/ArticleEditor.tsx → package.json
- `ArticleContent()` --references--> `dompurify`  [EXTRACTED]
  src/components/articles/ArticleContent.tsx → package.json
- `ArticleEditor()` --calls--> `revalidateArticle()`  [EXTRACTED]
  src/components/admin/ArticleEditor.tsx → src/actions/revalidate.ts
- `AdminLayout()` --calls--> `createClient()`  [EXTRACTED]
  src/app/admin/layout.tsx → src/lib/supabase/client.ts
- `AdminLoginPage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/admin/login/page.tsx → src/lib/supabase/client.ts

## Import Cycles
- None detected.

## Communities (76 total, 51 thin omitted)

### Community 0 - "Admin & Auth Pages"
Cohesion: 0.08
Nodes (29): revalidateAllArticles(), revalidateArticle(), AdminLayout(), AdminLoginPage(), AdminDashboard(), ArticleInteractions(), LoginPage(), ProfilePage() (+21 more)

### Community 1 - "Article Listings & Pages"
Cohesion: 0.07
Nodes (26): ArticlesPage(), PageProps, ArticlePage(), generateMetadata(), HomePage(), ArticleCard(), ArticleCardProps, ArticlesSidebar() (+18 more)

### Community 2 - "Build Toolchain"
Cohesion: 0.06
Nodes (32): autoprefixer, dotenv, devDependencies, autoprefixer, dotenv, postcss, tailwindcss, @tailwindcss/forms (+24 more)

### Community 3 - "TypeScript Configuration"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node, node_modules (+22 more)

### Community 4 - "Article Editor & Sanitizer"
Cohesion: 0.12
Nodes (23): dompurify, dompurify, ArticleEditor(), ArticleEditorProps, CATEGORIES, Settings(), slugify(), RichTextEditor() (+15 more)

### Community 5 - "Path Aliases & Imports"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 6 - "React Dependencies"
Cohesion: 0.15
Nodes (13): framer-motion, lucide-react, dependencies, framer-motion, lucide-react, react-dom, sonner, @supabase/auth-helpers-nextjs (+5 more)

### Community 7 - "Import Path Mappings"
Cohesion: 0.15
Nodes (13): ./src/app/*, ./src/components/*, ./src/lib/*, ./src/lib/hooks/*, ./src/lib/utils/*, ./src/types/*, paths, @/app/* (+5 more)

### Community 8 - "Layout & Theme Shell"
Cohesion: 0.24
Nodes (6): geistMono, geistSans, metadata, ClientShell(), EmergencyBanner(), ThemeProvider()

### Community 9 - "Admin User Management"
Cohesion: 0.33
Nodes (4): AdminUser, UserRow(), UserSearch(), UsersTable()

### Community 10 - "Data Types & Models"
Cohesion: 0.22
Nodes (9): Article, ArticleComment, ArticleTag, BookingFormData, CommentLike, Profile, Service, ServiceRequest (+1 more)

### Community 11 - "Admin API Routes"
Cohesion: 0.39
Nodes (5): PATCH(), GET(), generateStaticParams(), assertIsAdmin(), createSupabaseAdmin()

### Community 12 - "Image Processing"
Cohesion: 0.40
Nodes (4): JimpPkg, out, path, src

### Community 13 - "Article Filters"
Cohesion: 0.40
Nodes (3): ArticleFiltersProps, FilterOptions, SortOption

## Knowledge Gaps
- **165 isolated node(s):** `idea-refine.sh script`, `npx`, `$schema`, `style`, `rsc` (+160 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `React Dependencies` to `Build Toolchain`, `Article Editor & Sanitizer`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`?**
  _High betweenness centrality (0.344) - this node is a cross-community bridge._
- **Why does `dompurify` connect `Article Editor & Sanitizer` to `React Dependencies`?**
  _High betweenness centrality (0.253) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Admin & Auth Pages` to `Article Listings & Pages`, `Article Editor & Sanitizer`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ArticleEditor()` (e.g. with `Settings()` and `slugify()`) actually correct?**
  _`ArticleEditor()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `idea-refine.sh script`, `npx`, `$schema` to the rest of the system?**
  _165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin & Auth Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.07993197278911565 - nodes in this community are weakly interconnected._
- **Should `Article Listings & Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.06866002214839424 - nodes in this community are weakly interconnected._