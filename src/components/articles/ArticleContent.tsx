'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ArticleContentProps {
  content: string
}

export function ArticleContent({ content }: ArticleContentProps) {
  return (
    <div className="prose prose-lg max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Simple code block without syntax highlighting
          code({ node, inline, className, children, ...props }: any) {
            return inline ? (
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            ) : (
              <div className="my-4">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm font-mono" {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            )
          },
          
          // Custom pre tag
          pre({ node, children, ...props }: any) {
            return (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4" {...props}>
                {children}
              </pre>
            )
          },
          
          // Custom image rendering
          img({ node, ...props }: any) {
            return (
              <img
                {...props}
                className="w-full rounded-lg shadow-lg my-6"
                loading="lazy"
                alt={props.alt || 'تصویر'}
              />
            )
          },
          
          // Custom table rendering with RTL support
          table({ node, children, ...props }: any) {
            return (
              <div className="overflow-x-auto my-6">
                <table className="min-w-full divide-y divide-gray-200 border rounded-lg" {...props}>
                  {children}
                </table>
              </div>
            )
          },
          
          thead({ node, children, ...props }: any) {
            return (
              <thead className="bg-gray-50" {...props}>
                {children}
              </thead>
            )
          },
          
          th({ node, children, ...props }: any) {
            return (
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" {...props}>
                {children}
              </th>
            )
          },
          
          td({ node, children, ...props }: any) {
            return (
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-t" {...props}>
                {children}
              </td>
            )
          },
          
          // Custom blockquote
          blockquote({ node, children, ...props }: any) {
            return (
              <blockquote className="border-r-4 border-blue-500 pr-4 my-6 text-gray-600 italic bg-gray-50 py-3 rounded-l-lg" {...props}>
                {children}
              </blockquote>
            )
          },
          
          // Custom list rendering
          ul({ node, children, ...props }: any) {
            return (
              <ul className="list-disc list-inside space-y-2 my-4 pr-4" {...props}>
                {children}
              </ul>
            )
          },
          
          ol({ node, children, ...props }: any) {
            return (
              <ol className="list-decimal list-inside space-y-2 my-4 pr-4" {...props}>
                {children}
              </ol>
            )
          },
          
          li({ node, children, ...props }: any) {
            return (
              <li className="leading-relaxed" {...props}>
                {children}
              </li>
            )
          },
          
          // Custom heading with anchor links
          h1({ node, children, ...props }: any) {
            const text = String(children).toLowerCase().replace(/\s+/g, '-')
            return (
              <h1 id={text} className="text-3xl font-bold mt-8 mb-4 text-gray-900" {...props}>
                {children}
              </h1>
            )
          },
          
          h2({ node, children, ...props }: any) {
            const text = String(children).toLowerCase().replace(/\s+/g, '-')
            return (
              <h2 id={text} className="text-2xl font-bold mt-8 mb-4 text-gray-800" {...props}>
                {children}
              </h2>
            )
          },
          
          h3({ node, children, ...props }: any) {
            const text = String(children).toLowerCase().replace(/\s+/g, '-')
            return (
              <h3 id={text} className="text-xl font-bold mt-6 mb-3 text-gray-800" {...props}>
                {children}
              </h3>
            )
          },
          
          // Custom paragraph
          p({ node, children, ...props }: any) {
            return (
              <p className="mb-4 leading-relaxed text-gray-700" {...props}>
                {children}
              </p>
            )
          },
          
          // Custom link
          a({ node, children, href, ...props }: any) {
            const isExternal = href?.startsWith('http')
            return (
              
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-blue-600 hover:text-blue-800 underline transition-colors"
                {...props}
              >
                {children}
                {isExternal && (
                  <svg
                    className="inline-block w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                )}
              </a>
            )
          },
          
          // Custom horizontal rule
          hr({ node, ...props }: any) {
            return (
              <hr className="my-8 border-t-2 border-gray-200" {...props} />
            )
          },
          
          // Custom strong/bold
          strong({ node, children, ...props }: any) {
            return (
              <strong className="font-bold text-gray-900" {...props}>
                {children}
              </strong>
            )
          },
          
          // Custom emphasis/italic
          em({ node, children, ...props }: any) {
            return (
              <em className="italic text-gray-800" {...props}>
                {children}
              </em>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}