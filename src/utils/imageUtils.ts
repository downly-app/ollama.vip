// Image processing utility functions

/**
 * Check if URL is an SVG file
 */
export const isSvgUrl = (url: string): boolean => {
  return url.toLowerCase().includes('.svg') || url.toLowerCase().includes('svg');
};

/**
 * Add correct MIME type parameter for SVG URL
 */
export const fixSvgUrl = (url: string): string => {
  if (isSvgUrl(url)) {
    // If URL already contains parameters, use &, otherwise use ?
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}mime=image/svg+xml`;
  }
  return url;
};

/**
 * Safe base64 encoding function that supports Unicode characters
 */
const safeBase64Encode = (str: string): string => {
  try {
    // Use combination of encodeURIComponent and btoa to handle Unicode characters
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (error) {
    // If still fails, return a simple placeholder
    console.warn('Base64 encoding failed:', error);
    return btoa('<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1" rx="8"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="rgba(255,255,255,0.6)" font-family="Arial, sans-serif" font-size="12">Image Error</text></svg>');
  }
};

/**
 * Get image placeholder
 */
export const getImagePlaceholder = (alt?: string): string => {
  const altText = alt || 'Image load failed';
  // To avoid btoa errors, we limit alt text to safe characters only
  const safeAltText = altText.replace(/[^\x20-\x7E]/g, 'Image Error');

  const svgContent = `
    <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1" rx="8"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="rgba(255,255,255,0.6)" font-family="Arial, sans-serif" font-size="12">
        ${safeAltText}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${safeBase64Encode(svgContent)}`;
};

/**
 * Handle image loading errors
 */
export const handleImageError = (event: Event, alt?: string): void => {
  const img = event.target as HTMLImageElement;
  if (img) {
    img.src = getImagePlaceholder(alt);
    img.style.filter = 'none';
  }
};

/**
 * Preprocess image URLs and table scrolling in HTML
 */
export const preprocessImageUrls = (html: string): string => {
  // Process image URLs
  let processedHtml = html.replace(
    /<img([^>]*?)src=["']([^"']*?)["']([^>]*?)>/gi,
    (match, before, src, after) => {
      const fixedSrc = fixSvgUrl(src);
      const alt = match.match(/alt=["']([^"']*?)["']/i)?.[1] || '';

      // Create a simple error handling placeholder, avoid using complex base64 in HTML attributes
      const errorPlaceholder = 'data:image/svg+xml;base64,' + btoa('<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1" rx="8"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="rgba(255,255,255,0.6)" font-family="Arial, sans-serif" font-size="12">Image Error</text></svg>');

      return `<img${before}src="${fixedSrc}"${after} onerror="this.src='${errorPlaceholder}'; this.style.filter='none';">`;
    }
  );

  // Add scroll container wrapper for tables
  processedHtml = processedHtml.replace(
    /<table([^>]*)>/gi,
    '<div class="table-scroll-wrapper"><table$1>'
  );

  processedHtml = processedHtml.replace(
    /<\/table>/gi,
    '</table></div>'
  );

  return processedHtml;
};