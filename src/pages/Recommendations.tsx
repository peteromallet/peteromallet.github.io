import { useCallback, useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import { Header } from '../components/Header';
import { LoadingImage } from '../components/LoadingImage';
import type { RecommendationEntry } from '../types';

export type MediaWidth = 'full' | 'half' | 'third';
export type MediaWrap = 'block' | 'left' | 'right';

export type MediaItem = {
  kind: 'image' | 'video';
  src: string;
  alt?: string;
  link?: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  title?: string;
  titleLink?: string;
  button?: string;
  buttonLink?: string;
};

export type MediaBlock = {
  kind: 'media';
  item: MediaItem;
  width: MediaWidth;
  wrap: MediaWrap;
};

export type CarouselBlock = {
  kind: 'carousel';
  items: MediaItem[];
  width: MediaWidth;
  wrap: MediaWrap;
};

export type RecommendationDirectiveBlock = MediaBlock | CarouselBlock;

export type RecommendationMarkdownPart =
  | { kind: 'markdown'; markdown: string }
  | RecommendationDirectiveBlock;

export type RenderedRecommendationSegment =
  | { type: 'html'; html: string }
  | { type: 'carousel'; data: CarouselBlock }
  | { type: 'video'; data: MediaBlock }
  | { type: 'image'; data: MediaBlock };

const ATTRIBUTE_PATTERN = /(\w+)=(?:"([^"]*)"|(\S+))/g;
const DIRECTIVE_OPEN_PATTERN = /^:::(media|carousel)\{([^}]*)\}\s*$/;
const DIRECTIVE_CLOSE_PATTERN = /^:::\s*$/;
const COMBINED_PLACEHOLDER_PATTERN = /(?:<p>\s*)?<!--(CAROUSEL|VIDEO|IMAGE):(\d+)-->(?:\s*<\/p>)?/g;

export function parseDirectiveAttributes(input: string): Record<string, string> {
  const attributes: Record<string, string> = {};

  for (const match of input.matchAll(ATTRIBUTE_PATTERN)) {
    attributes[match[1]] = match[2] ?? match[3] ?? '';
  }

  return attributes;
}

function parseWidth(value?: string): MediaWidth {
  return value === 'half' || value === 'third' ? value : 'full';
}

function parseWrap(value?: string): MediaWrap {
  return value === 'left' || value === 'right' ? value : 'block';
}

function isEnabled(value?: string): boolean | undefined {
  return value === 'true' ? true : undefined;
}

function parseMediaItem(attributes: Record<string, string>, context: string): MediaItem | null {
  if (attributes.type !== 'image' && attributes.type !== 'video') {
    console.warn(`Skipping ${context}: unknown media type "${attributes.type ?? ''}"`);
    return null;
  }

  if (!attributes.src) {
    console.warn(`Skipping ${context}: missing src`);
    return null;
  }

  return {
    kind: attributes.type,
    src: attributes.src,
    alt: attributes.alt,
    link: attributes.link,
    poster: attributes.poster,
    autoplay: isEnabled(attributes.autoplay),
    loop: isEnabled(attributes.loop),
    muted: isEnabled(attributes.muted),
    title: attributes.title,
    titleLink: attributes.title_link,
    button: attributes.button,
    buttonLink: attributes.button_link,
  };
}

export function parseRecommendationDirectiveBlocks(markdown: string): RecommendationMarkdownPart[] {
  const lines = markdown.split(/\r?\n/);
  const parts: RecommendationMarkdownPart[] = [];
  let markdownBuffer: string[] = [];

  const flushMarkdown = () => {
    if (markdownBuffer.length === 0) return;
    parts.push({ kind: 'markdown', markdown: markdownBuffer.join('\n') });
    markdownBuffer = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const openMatch = line.trim().match(DIRECTIVE_OPEN_PATTERN);

    if (!openMatch) {
      markdownBuffer.push(line);
      continue;
    }

    const directiveKind = openMatch[1] as 'media' | 'carousel';
    const attributes = parseDirectiveAttributes(openMatch[2]);
    const closeIndex = lines.findIndex((candidate, candidateIndex) => (
      candidateIndex > index && DIRECTIVE_CLOSE_PATTERN.test(candidate.trim())
    ));

    if (closeIndex === -1) {
      markdownBuffer.push(line);
      continue;
    }

    flushMarkdown();

    if (directiveKind === 'media') {
      const item = parseMediaItem(attributes, 'media directive');
      if (item) {
        parts.push({
          kind: 'media',
          item,
          width: parseWidth(attributes.width),
          wrap: parseWrap(attributes.wrap),
        });
      }
    } else {
      const items = lines
        .slice(index + 1, closeIndex)
        .map((itemLine) => itemLine.trim())
        .filter((itemLine) => itemLine.startsWith('- '))
        .map((itemLine) => parseMediaItem(
          parseDirectiveAttributes(itemLine.slice(2).trim()),
          'carousel item',
        ))
        .filter((item): item is MediaItem => Boolean(item));

      if (items.length > 0) {
        parts.push({
          kind: 'carousel',
          items,
          width: parseWidth(attributes.width),
          wrap: parseWrap(attributes.wrap),
        });
      } else {
        console.warn('Skipping carousel directive: no valid media items');
      }
    }

    index = closeIndex;
  }

  flushMarkdown();

  return parts;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function mediaClassName(width: MediaWidth, wrap: MediaWrap): string {
  return `media media-${width} media-wrap-${wrap}`;
}

function hasOverlays(item: MediaItem): boolean {
  return Boolean(item.title || item.button);
}

function compileFlatImage(block: MediaBlock): string {
  const className = mediaClassName(block.width, block.wrap);
  const { item } = block;
  const image = `<img class="${className}" src="${escapeAttribute(item.src)}" alt="${escapeAttribute(item.alt ?? '')}">`;
  if (!item.link) return image;
  return `<a href="${escapeAttribute(item.link)}" target="_blank" rel="noopener noreferrer">${image}</a>`;
}

function compileMediaBlock(
  block: MediaBlock,
  videos: MediaBlock[],
  images: MediaBlock[],
): string {
  if (block.item.kind === 'image') {
    if (!hasOverlays(block.item)) {
      return compileFlatImage(block);
    }
    const imageIndex = images.push(block) - 1;
    return `<!--IMAGE:${imageIndex}-->`;
  }
  const videoIndex = videos.push(block) - 1;
  return `<!--VIDEO:${videoIndex}-->`;
}

export function splitHtmlWithCarousels(
  html: string,
  carousels: CarouselBlock[],
): RenderedRecommendationSegment[] {
  return splitHtmlWithBlocks(html, carousels, [], []);
}

export function splitHtmlWithBlocks(
  html: string,
  carousels: CarouselBlock[],
  videos: MediaBlock[],
  images: MediaBlock[] = [],
): RenderedRecommendationSegment[] {
  const segments: RenderedRecommendationSegment[] = [];
  let lastIndex = 0;

  for (const match of html.matchAll(COMBINED_PLACEHOLDER_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const htmlBefore = html.slice(lastIndex, matchIndex);
    if (htmlBefore) {
      segments.push({ type: 'html', html: htmlBefore });
    }

    const kind = match[1];
    const idx = Number(match[2]);
    if (kind === 'CAROUSEL') {
      const carousel = carousels[idx];
      if (carousel) {
        segments.push({ type: 'carousel', data: carousel });
      } else {
        segments.push({ type: 'html', html: match[0] });
      }
    } else if (kind === 'VIDEO') {
      const video = videos[idx];
      if (video) {
        segments.push({ type: 'video', data: video });
      } else {
        segments.push({ type: 'html', html: match[0] });
      }
    } else {
      const image = images[idx];
      if (image) {
        segments.push({ type: 'image', data: image });
      } else {
        segments.push({ type: 'html', html: match[0] });
      }
    }

    lastIndex = matchIndex + match[0].length;
  }

  const htmlAfter = html.slice(lastIndex);
  if (htmlAfter || segments.length === 0) {
    segments.push({ type: 'html', html: htmlAfter });
  }

  return segments;
}

export function sanitizeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
    .replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, ' $1="#"');
}

export function renderBody(markdown: string): RenderedRecommendationSegment[] {
  const carousels: CarouselBlock[] = [];
  const videos: MediaBlock[] = [];
  const images: MediaBlock[] = [];
  const rewrittenMarkdown = parseRecommendationDirectiveBlocks(markdown)
    .map((part) => {
      if (part.kind === 'markdown') {
        return part.markdown;
      }

      if (part.kind === 'media') {
        return compileMediaBlock(part, videos, images);
      }

      const carouselIndex = carousels.push(part) - 1;
      return `<!--CAROUSEL:${carouselIndex}-->`;
    })
    .join('\n\n');

  return splitHtmlWithBlocks(
    sanitizeHtml(marked.parse(rewrittenMarkdown) as string),
    carousels,
    videos,
    images,
  );
}

interface Props {
  recommendations?: RecommendationEntry[];
}

export function RecommendationsPage({ recommendations: ssrData }: Props) {
  const [recommendations, setRecommendations] = useState<RecommendationEntry[]>(ssrData ?? []);

  useEffect(() => {
    if (recommendations.length === 0) return;
    const openFromHash = () => {
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (!hash) return;
      const target = document.getElementById(hash);
      if (!target || target.tagName !== 'DETAILS') return;
      (target as HTMLDetailsElement).open = true;
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, [recommendations]);

  useEffect(() => {
    if (ssrData && ssrData.length > 0) return;
    const config = window.__APP_CONFIG__;
    if (!config?.supabaseUrl || !config?.supabaseAnonKey) return;
    fetch(
      `${config.supabaseUrl}/rest/v1/recommendations?order=created_at.desc&select=id,name,role_title,emoji,linkedin_url,location,body_markdown,image_url,intro_url,context,status,is_hired,is_freelancer,sort_order,created_at`,
      {
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${config.supabaseAnonKey}`,
        },
      },
    )
      .then((r) => r.json())
      .then((data) => setRecommendations(data))
      .catch(() => {});
  }, [ssrData]);

  return (
    <div className="container">
      <Header activeTab="assorted" />
      <div id="sorted-section" className="content-section">
        <div className="sorted-section-content">
          <div className="sorted-breadcrumb">
            <a href="/assorted">Assorted</a> / Recommendations
          </div>
          <p className="mb-4 text-[0.8rem] text-[#999] italic">
            Fine individuals I recommend. Context on my relationship with each below. I <a href="https://advisable.notion.site/10-incredible-engineers-operators-and-designers-who-are-available-for-new-opportunities-ea659282b6a34735a0b8775e4ebc9cb2" target="_blank" rel="noopener noreferrer" className="text-[#4a90d9] hover:underline">started doing this</a> after I shut down my company. It resulted in everyone getting job offers, including many who still work at the company today.
          </p>

          {recommendations.length === 0 && (
            <p className="text-[0.85rem] text-[#999]">No recommendations yet.</p>
          )}

          <div className="flex flex-col" style={{ gap: '0.5rem' }}>
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  hired: { label: 'Hired', className: 'recommendation-status-hired' },
  taking_clients: { label: 'Taking Clients', className: 'recommendation-status-available' },
  probably_unavailable: { label: 'Probably Unavailable', className: 'recommendation-status-unavailable' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.probably_unavailable;
  return <span className={config.className}>{config.label}</span>;
}

export function recommendationSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'recommendation';
}

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="recommendation-share-link"
      aria-label="Copy direct link to this recommendation"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}${window.location.pathname}#${slug}`;
        const done = () => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        };
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(url).then(done).catch(done);
        } else {
          done();
        }
      }}
    >
      {copied ? '✓ Copied' : '🔗 Copy link'}
    </button>
  );
}

function MediaOverlays({ item }: { item: MediaItem }) {
  return (
    <>
      {item.title && (
        item.titleLink ? (
          <a
            className="media-title"
            href={item.titleLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {item.title}
          </a>
        ) : (
          <span className="media-title">{item.title}</span>
        )
      )}
      {item.button && (
        (() => {
          const href = item.buttonLink ?? item.link;
          return href ? (
            <a
              className="media-button"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {item.button}
            </a>
          ) : (
            <span className="media-button">{item.button}</span>
          );
        })()
      )}
    </>
  );
}

function useTapReveal(timeoutMs = 3000) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<number | null>(null);

  const reveal = useCallback(() => {
    setRevealed(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setRevealed(false);
      timerRef.current = null;
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  return { revealed, reveal };
}

export function MediaImage({
  item,
  width,
  wrap,
}: {
  item: MediaItem;
  width: MediaWidth;
  wrap: MediaWrap;
}) {
  const { revealed, reveal } = useTapReveal();
  const className = `${mediaClassName(width, wrap)} media-frame${revealed ? ' media-revealed' : ''}`;
  const image = <LoadingImage src={item.src} alt={item.alt ?? ''} loading="lazy" />;

  return (
    <div className={className} onClick={reveal}>
      {item.link ? (
        <a
          className="media-link"
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {image}
        </a>
      ) : image}
      <MediaOverlays item={item} />
    </div>
  );
}

export function MediaVideo({
  item,
  width,
  wrap,
  isActive = true,
}: {
  item: MediaItem;
  width: MediaWidth;
  wrap: MediaWrap;
  isActive?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [inView, setInView] = useState(false);
  const { revealed, reveal } = useTapReveal();

  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === 'undefined') return;
    const node = containerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.4),
      { threshold: [0, 0.4, 0.75] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView && isActive) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [inView, isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  return (
    <div
      ref={containerRef}
      className={`${mediaClassName(width, wrap)} media-frame media-video-frame${revealed ? ' media-revealed' : ''}`}
      onClick={reveal}
    >
      <video
        ref={videoRef}
        className="media-video"
        controls
        playsInline
        muted
        loop={item.loop === true}
        poster={item.poster}
      >
        <source src={item.src} />
      </video>
      {muted && (
        <button
          type="button"
          className="media-unmute"
          onClick={(e) => {
            e.stopPropagation();
            setMuted(false);
          }}
          aria-label="Unmute video"
        >
          <span aria-hidden="true">🔊</span> Tap to unmute
        </button>
      )}
      <MediaOverlays item={item} />
    </div>
  );
}

export function Carousel({ items, width, wrap }: Pick<CarouselBlock, 'items' | 'width' | 'wrap'>) {
  const [index, setIndex] = useState(0);
  const currentItem = items[index];

  if (!currentItem) {
    return null;
  }

  const goPrevious = () => setIndex((current) => Math.max(0, current - 1));
  const goNext = () => setIndex((current) => Math.min(items.length - 1, current + 1));

  return (
    <div
      className={`${mediaClassName(width, wrap)} media-carousel`}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          goPrevious();
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          goNext();
        }
      }}
    >
      {currentItem.kind === 'image' ? (
        <MediaImage item={currentItem} width="full" wrap="block" />
      ) : (
        <MediaVideo item={currentItem} width="full" wrap="block" isActive />
      )}
      <div className="media-carousel-controls">
        <button
          type="button"
          className="media-carousel-btn"
          onClick={goPrevious}
          disabled={index === 0}
          aria-label="Previous media"
        >
          Prev
        </button>
        <span className="media-carousel-count">
          {index + 1} / {items.length}
        </span>
        <button
          type="button"
          className="media-carousel-btn"
          onClick={goNext}
          disabled={index === items.length - 1}
          aria-label="Next media"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function RecommendationsBody({
  markdown,
  image,
}: {
  markdown: string;
  image?: { src: string; alt: string };
}) {
  return (
    <div className="recommendation-body text-[0.82rem] leading-[1.7] text-[#666]">
      {image && (
        <LoadingImage
          src={image.src}
          alt={image.alt}
          className="recommendation-image"
          loading="lazy"
        />
      )}
      {renderBody(markdown).map((segment, index) => {
        if (segment.type === 'html') {
          return <div key={`html-${index}`} dangerouslySetInnerHTML={{ __html: segment.html }} />;
        }
        if (segment.type === 'carousel') {
          return (
            <Carousel
              key={`carousel-${index}`}
              items={segment.data.items}
              width={segment.data.width}
              wrap={segment.data.wrap}
            />
          );
        }
        if (segment.type === 'image') {
          return (
            <MediaImage
              key={`image-${index}`}
              item={segment.data.item}
              width={segment.data.width}
              wrap={segment.data.wrap}
            />
          );
        }
        return (
          <MediaVideo
            key={`video-${index}`}
            item={segment.data.item}
            width={segment.data.width}
            wrap={segment.data.wrap}
          />
        );
      })}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: RecommendationEntry }) {
  const slug = recommendationSlug(rec.name);
  return (
    <details className="recommendation-card" id={slug}>
      <summary className="recommendation-summary">
        <div className="recommendation-summary-content">
          {rec.image_url && (
            <LoadingImage
              src={rec.image_url}
              alt={rec.name}
              className="recommendation-thumb"
              loading="lazy"
            />
          )}
          <div className="recommendation-summary-text">
            <div className="flex items-center gap-2">
              {rec.emoji && <span className="text-base">{rec.emoji}</span>}
              <span className="text-[0.95rem] font-semibold text-[#333]">{rec.name}</span>
              {rec.linkedin_url && (
                <a
                  href={rec.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.75rem] text-[#4a90d9] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  LinkedIn
                </a>
              )}
              {rec.location && (
                <>
                  <span className="text-[#ccc]">|</span>
                  <span className="text-[0.75rem] text-[#999]">{rec.location}</span>
                </>
              )}
            </div>
            <div className="mt-0.5 text-[0.8rem] text-[#666]">{rec.role_title}</div>
          </div>
          <StatusBadge status={rec.status} />
          <CopyLinkButton slug={slug} />
        </div>
      </summary>
      <div className="recommendation-expanded">
        <RecommendationsBody
          markdown={rec.body_markdown}
          image={rec.image_url ? { src: rec.image_url, alt: rec.name } : undefined}
        />
        {rec.context && (
          <div className="recommendation-context">
            <span className="recommendation-context-label">Context:</span> {rec.context}
          </div>
        )}
      </div>
    </details>
  );
}
