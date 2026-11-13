import DOMPurify from 'dompurify';

/** Sanitize markup before it is passed to Angular's trusted HTML API. */
export function sanitizeHtmlMarkup(markup: string): string {
  return DOMPurify.sanitize(markup, { RETURN_TRUSTED_TYPE: false });
}

/** Keep SVG preview support while removing executable SVG and HTML payloads. */
export function sanitizeSvgMarkup(markup: string): string {
  return DOMPurify.sanitize(markup, {
    USE_PROFILES: { svg: true, svgFilters: true },
    RETURN_TRUSTED_TYPE: false,
  });
}
