import { Fragment } from 'react';
import type {
  DataCardData,
  HomeCardData,
  JSXLink,
  MemeCardData,
  ProjectCardData,
  StoryCardData,
  VideoCardData,
} from '../../data/home-cards';
import { useVideosReady } from '../../hooks/useVideosReady';
import { LoadingImage } from '../LoadingImage';
import { VideoPlayer } from '../VideoPlayer';
import { WeightsChart } from '../WeightsChart';

interface CardTileProps {
  card: HomeCardData;
  expanded: boolean;
  isMobile: boolean;
}

function ParagraphList({ paragraphs }: { paragraphs: string[] }) {
  return paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}

function LinkRow({
  links,
}: {
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div className="card-link-row">
      <span>
        {links.map((link, index) => (
          <Fragment key={link.href}>
            <a href={link.href} target="_blank" rel="noreferrer" className="card-year-link">
              {link.label}
            </a>
            {index < links.length - 1 ? (
              <span className="mx-1 inline-block text-[#ccc]">|</span>
            ) : null}
          </Fragment>
        ))}
      </span>
    </div>
  );
}

export function StoryCard({ card }: { card: StoryCardData }) {
  return (
    <>
      <div className="card-image-container">
        <LoadingImage src={card.imageSrc} alt={card.imageAlt} loading="lazy" />
      </div>
      <h3>{card.title}</h3>
      <div className="card-text-content">
        <ParagraphList paragraphs={card.paragraphs} />
        {card.linkLabel && card.linkHref ? (
          <div className="card-link-row">
            <a href={card.linkHref} target="_blank" rel="noreferrer" className="card-year-link">
              {card.linkLabel}
            </a>
          </div>
        ) : null}
        {card.linkLinks ? <LinkRow links={card.linkLinks} /> : null}
      </div>
    </>
  );
}

function renderProjectBodyPart(part: string | JSXLink, index: number) {
  if (typeof part === 'string') return <Fragment key={index}>{part}</Fragment>;
  return (
    <a key={`${part.href}-${index}`} href={part.href} target="_blank" rel="noreferrer">
      {part.label}
    </a>
  );
}

export function ProjectCard({ card }: { card: ProjectCardData }) {
  const videosReady = useVideosReady();
  return (
    <>
      <div className="card-image-container">
        <LoadingImage src={card.imageSrc} alt={card.imageAlt} loading="lazy" />
        {card.hoverGifSrc && videosReady ? (
          <div className="card-hover-gif">
            <video src={card.hoverGifSrc} autoPlay loop muted playsInline preload="none" className="ignore-load" />
          </div>
        ) : null}
      </div>
      <h3>{card.title}</h3>
      <div className="card-text-content">
        <p>{card.body.map((part, index) => renderProjectBodyPart(part, index))}</p>
        <div className="card-link-row">
          <span>
            <a href={card.linkHref} target="_blank" rel="noreferrer" className="card-year-link">
              {card.linkLabel}
            </a>
          </span>
        </div>
      </div>
    </>
  );
}

export function VideoCardTile({
  card,
  expanded,
  isMobile,
}: {
  card: VideoCardData;
  expanded: boolean;
  isMobile: boolean;
}) {
  return (
    <>
      <VideoPlayer
        thumbnailSrc={card.thumbnailSrc}
        thumbnailAlt={card.thumbnailAlt}
        embedSrc={card.embedSrc}
        embedTitle={card.embedTitle}
        expanded={expanded}
        isMobile={isMobile}
      />
      <h3>{card.title}</h3>
      <div className="card-text-content">
        <ParagraphList paragraphs={card.body} />
        <LinkRow links={card.links} />
      </div>
    </>
  );
}

export function DataCard({ card: _card }: { card: DataCardData }) {
  return <WeightsChart />;
}

export function MemeCard({
  card,
  expanded,
}: {
  card: MemeCardData;
  expanded: boolean;
}) {
  return (
    <>
      <div className="card-image-container">
        <LoadingImage src={card.imageSrc} alt={card.imageAlt} className="card-main-image" loading="lazy" />
      </div>
      <h3>{card.title}</h3>
      <div className="card-text-content">
        <p>Here is a small collection of memes that I think about a lot.</p>
        <p>
          If you find any memes you think I&apos;ll enjoy, please send them to me via{' '}
          <a href="mailto:peter@omalley.io">electronic mail</a>.
        </p>
      </div>
      <div className="meme-hover-container">
        {card.memeImages.map((image, index) => (
          <div
            key={image.src}
            className="meme-image"
            style={expanded ? { transitionDelay: `${0.1 * (index + 1)}s` } : undefined}
          >
            <LoadingImage src={image.src} alt={image.alt} loading="lazy" />
          </div>
        ))}
      </div>
    </>
  );
}

export function CardContent({ card, expanded, isMobile }: CardTileProps) {
  switch (card.kind) {
    case 'story':
      return <StoryCard card={card} />;
    case 'project':
      return <ProjectCard card={card} />;
    case 'video':
      return <VideoCardTile card={card} expanded={expanded} isMobile={isMobile} />;
    case 'data':
      return <DataCard card={card} />;
    case 'meme':
      return <MemeCard card={card} expanded={expanded} />;
  }
}
