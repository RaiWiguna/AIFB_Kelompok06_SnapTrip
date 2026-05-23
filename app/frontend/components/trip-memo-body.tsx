import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { TripDetailFull } from "@/lib/trip-detail"

/**
 * Shared memo body — moodboard tiles + GFM markdown article.
 * Used by /trips/[id]/memo and /plan/[id]/memo so they look identical.
 */
export function TripMemoBody({ detail }: { detail: TripDetailFull }) {
  return (
    <>
      {/* Moodboard */}
      <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {detail.memoTiles.map((m, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-2xl ring-1 ring-border/60">
            <Image src={m.src} alt={m.alt} fill className="object-cover" sizes="220px" />
          </div>
        ))}
      </section>

      {/* Markdown body */}
      <article className="memo-prose mt-10 rounded-3xl bg-card p-7 ring-1 ring-border/70 md:p-10">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: (props) => (
              <h2
                {...props}
                className="mt-8 font-display text-[26px] leading-tight tracking-[-0.01em] text-primary first:mt-0"
              />
            ),
            h2: (props) => (
              <h3
                {...props}
                className="mt-8 font-display text-[22px] leading-tight tracking-[-0.01em] text-primary first:mt-0"
              />
            ),
            h3: (props) => (
              <h4
                {...props}
                className="mt-6 text-[15px] font-semibold uppercase tracking-[0.04em] text-foreground first:mt-0"
              />
            ),
            p: (props) => <p {...props} className="mt-4 text-[15px] leading-[1.7] text-foreground/80" />,
            ul: (props) => <ul {...props} className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] text-foreground/80" />,
            ol: (props) => (
              <ol {...props} className="mt-4 list-decimal space-y-1.5 pl-5 text-[15px] text-foreground/80" />
            ),
            li: (props) => <li {...props} className="leading-[1.65]" />,
            blockquote: (props) => (
              <blockquote
                {...props}
                className="mt-5 border-l-2 border-primary/40 bg-secondary/40 px-4 py-3 text-[14px] italic leading-relaxed text-foreground/80"
              />
            ),
            a: (props) => (
              <a
                {...props}
                className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
              />
            ),
            strong: (props) => <strong {...props} className="font-semibold text-foreground" />,
            em: (props) => <em {...props} className="italic" />,
            hr: (props) => <hr {...props} className="my-8 border-border/70" />,
            img: ({ src, alt }) =>
              typeof src === "string" ? (
                <span className="my-5 block overflow-hidden rounded-2xl ring-1 ring-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={alt ?? ""} className="block h-auto w-full" />
                </span>
              ) : null,
            code: ({ children, ...props }) => (
              <code
                {...props}
                className="rounded bg-secondary/70 px-1.5 py-0.5 text-[13px] font-mono text-foreground"
              >
                {children}
              </code>
            ),
          }}
        >
          {detail.memoMarkdown}
        </ReactMarkdown>
      </article>
    </>
  )
}
