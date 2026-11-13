import { describe, expect, it } from 'vitest';
import { sanitizeHtmlMarkup, sanitizeSvgMarkup } from './markup-sanitizer';

describe('markup sanitizers', () => {
  it('removes executable HTML while preserving safe formatted content', () => {
    const clean = sanitizeHtmlMarkup(
      '<p onclick="alert(1)">Hello</p><img src=x onerror="alert(2)"><script>alert(3)</script>'
    );

    expect(clean).toContain('<p>Hello</p>');
    expect(clean).not.toMatch(/onclick|onerror|<script|javascript:/i);
  });

  it('removes executable SVG and embedded HTML while preserving safe shapes', () => {
    const clean = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><foreignObject><img src=x onerror="alert(3)"></foreignObject><rect width="10" height="10" fill="#f00"/></svg>'
    );

    expect(clean).toContain('<svg');
    expect(clean).toContain('<rect');
    expect(clean).not.toMatch(/onload|onerror|<script|foreignObject|javascript:/i);
  });

  it('removes embedded executable content from malformed SVG previews', () => {
    const clean = sanitizeSvgMarkup('<svg><foreignObject><iframe src="javascript:alert(1)"></iframe></foreignObject></svg>');

    expect(clean).not.toMatch(/foreignObject|iframe|javascript:/i);
  });
});
