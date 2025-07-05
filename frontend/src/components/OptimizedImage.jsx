import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './OptimizedImage.css';

const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  lazy = true,
  placeholder = 'blur',
  quality = 80,
  priority = false,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [imageSrc, setImageSrc] = useState(priority ? src : '');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Generate optimized image URLs for different screen sizes
  const generateSrcSet = (baseSrc, baseWidth) => {
    if (!baseSrc || !baseWidth) return '';
    
    const sizes = [320, 640, 768, 1024, 1280, 1536];
    const srcSetEntries = sizes
      .filter(size => size <= baseWidth * 2) // Don't upscale beyond 2x
      .map(size => {
        // In a real implementation, you'd use an image optimization service
        // For now, we'll assume the same URL with query parameters
        const optimizedUrl = `${baseSrc}?w=${size}&q=${quality}&format=webp`;
        return `${optimizedUrl} ${size}w`;
      });
    
    return srcSetEntries.join(', ');
  };

  // Generate sizes attribute for responsive images
  const generateSizes = (width) => {
    if (!width) return '100vw';
    
    return [
      '(max-width: 320px) 280px',
      '(max-width: 640px) 600px',
      '(max-width: 768px) 720px',
      '(max-width: 1024px) 960px',
      '(max-width: 1280px) 1200px',
      `${width}px`
    ].join(', ');
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading when image is 50px away from viewport
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy, priority, isInView, src]);

  // Load image when in view
  useEffect(() => {
    if (isInView && !imageSrc && src) {
      setImageSrc(src);
    }
  }, [isInView, imageSrc, src]);

  const handleLoad = (event) => {
    setIsLoaded(true);
    setHasError(false);
    if (onLoad) onLoad(event);
  };

  const handleError = (event) => {
    setHasError(true);
    setIsLoaded(false);
    if (onError) onError(event);
  };

  // Generate placeholder based on type
  const getPlaceholder = () => {
    if (placeholder === 'blur') {
      return (
        <div className="optimized-image__placeholder optimized-image__placeholder--blur">
          <div className="optimized-image__placeholder-content">
            <svg
              className="optimized-image__placeholder-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      );
    }
    
    if (placeholder === 'skeleton') {
      return <div className="optimized-image__placeholder optimized-image__placeholder--skeleton" />;
    }
    
    return null;
  };

  // Error fallback
  const ErrorFallback = () => (
    <div className="optimized-image__error">
      <svg
        className="optimized-image__error-icon"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
      <span>Failed to load image</span>
    </div>
  );

  const containerClasses = [
    'optimized-image',
    className,
    isLoaded ? 'optimized-image--loaded' : '',
    hasError ? 'optimized-image--error' : '',
    !isInView ? 'optimized-image--lazy' : ''
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={imgRef}
      className={containerClasses}
      style={{ 
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        aspectRatio: width && height ? `${width}/${height}` : undefined
      }}
    >
      {!isInView && getPlaceholder()}
      
      {hasError ? (
        <ErrorFallback />
      ) : (
        isInView && imageSrc && (
          <picture>
            {/* WebP format for modern browsers */}
            <source
              srcSet={generateSrcSet(imageSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp'), width)}
              sizes={generateSizes(width)}
              type="image/webp"
            />
            
            {/* AVIF format for even better compression */}
            <source
              srcSet={generateSrcSet(imageSrc.replace(/\.(jpg|jpeg|png)$/i, '.avif'), width)}
              sizes={generateSizes(width)}
              type="image/avif"
            />
            
            {/* Fallback to original format */}
            <img
              src={imageSrc}
              srcSet={generateSrcSet(imageSrc, width)}
              sizes={generateSizes(width)}
              alt={alt}
              width={width}
              height={height}
              onLoad={handleLoad}
              onError={handleError}
              loading={lazy && !priority ? 'lazy' : 'eager'}
              decoding="async"
              className="optimized-image__img"
              {...props}
            />
          </picture>
        )
      )}
      
      {!isLoaded && isInView && !hasError && getPlaceholder()}
    </div>
  );
};

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  className: PropTypes.string,
  lazy: PropTypes.bool,
  placeholder: PropTypes.oneOf(['blur', 'skeleton', 'none']),
  quality: PropTypes.number,
  priority: PropTypes.bool,
  onLoad: PropTypes.func,
  onError: PropTypes.func
};

export default OptimizedImage;