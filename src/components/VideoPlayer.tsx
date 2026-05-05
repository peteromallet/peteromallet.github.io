import { useEffect, useMemo, useState } from 'react';
import { Icon } from './icons';
import { LoadingImage } from './LoadingImage';

interface VideoPlayerProps {
  className?: string;
  thumbnailSrc: string;
  thumbnailAlt: string;
  embedSrc: string;
  embedTitle: string;
  expanded: boolean;
  isMobile: boolean;
}

export function VideoPlayer({
  className = '',
  thumbnailSrc,
  thumbnailAlt,
  embedSrc,
  embedTitle,
  expanded,
  isMobile,
}: VideoPlayerProps) {
  const [revealed, setRevealed] = useState(false);
  const iframeSrc = useMemo(() => {
    if (!revealed) return '';
    return `${embedSrc}${embedSrc.includes('?') ? '&' : '?'}autoplay=1`;
  }, [embedSrc, revealed]);

  useEffect(() => {
    if (!expanded && isMobile) {
      setRevealed(false);
    }
  }, [expanded, isMobile]);

  return (
    <div
      className={`video-container ${className}`.trim()}
      data-revealed={revealed ? 'true' : 'false'}
      onMouseLeave={() => {
        if (!isMobile) {
          setRevealed(false);
        }
      }}
    >
      <LoadingImage
        src={thumbnailSrc}
        alt={thumbnailAlt}
        className="video-thumbnail"
        wrapperClassName="video-thumbnail-shell"
      />
      <button
        type="button"
        className="video-overlay"
        aria-label={`Play ${embedTitle}`}
        onClick={(event) => {
          event.stopPropagation();
          setRevealed(true);
        }}
      >
        <Icon name="play-circle" className="video-play-icon" />
      </button>
      <div className="video-embed">
        {revealed ? (
          <iframe
            width="100%"
            height="100%"
            src={iframeSrc}
            title={embedTitle}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            playsInline
          />
        ) : null}
      </div>
    </div>
  );
}
