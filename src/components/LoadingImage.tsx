import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';

interface LoadingImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
}

export function LoadingImage({
  wrapperClassName = '',
  className = '',
  src,
  onLoad,
  onError,
  ...props
}: LoadingImageProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    if (imageRef.current?.complete && imageRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <span className={`image-shell${loaded ? ' image-shell-loaded' : ''}${wrapperClassName ? ` ${wrapperClassName}` : ''}`}>
      <span className="image-skeleton" aria-hidden="true"></span>
      <img
        {...props}
        ref={imageRef}
        src={src}
        className={className}
        data-loaded={loaded ? 'true' : 'false'}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          setLoaded(true);
          onError?.(event);
        }}
      />
    </span>
  );
}
