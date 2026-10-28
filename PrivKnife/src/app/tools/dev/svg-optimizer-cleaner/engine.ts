import {
  CodeExportFormat,
  SvgOptimizerCleanerOptions,
  SvgOptimizerCleanerResult,
  SvgOptimizationStats,
} from './types';

/**
 * Validate an SVG string
 */
export function validateSvg(svgContent: string): { isValid: boolean; error?: string } {
  if (!svgContent || typeof svgContent !== 'string' || !svgContent.trim()) {
    return { isValid: false, error: 'SVG content cannot be empty.' };
  }

  const trimmed = svgContent.trim();
  if (!trimmed.includes('<svg')) {
    return { isValid: false, error: 'Missing root <svg> element.' };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'image/svg+xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return { isValid: false, error: parserError.textContent || 'XML parsing error.' };
    }
    if (doc.documentElement.nodeName.toLowerCase() !== 'svg') {
      return { isValid: false, error: 'Root element is not <svg>.' };
    }
    return { isValid: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    return { isValid: false, error: message };
  }
}

/**
 * Round a single number string to the given float precision
 */
export function roundNumber(val: number | string, precision: number): string {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return String(val);
  if (precision <= 0) {
    return Math.round(num).toString();
  }
  const factor = Math.pow(10, precision);
  const rounded = Math.round(num * factor) / factor;
  return rounded.toString();
}

/**
 * Round numbers in path 'd' attribute string
 */
export function optimizePathData(d: string, precision: number): string {
  return d.replace(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g, (match) => {
    return roundNumber(match, precision);
  });
}

/**
 * Convert color to compact hex if applicable
 */
export function optimizeColor(color: string): string {
  if (!color) return color;
  const trimmed = color.trim().toLowerCase();

  // rgb(r, g, b) -> #rrggbb
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10));
    const g = Math.min(255, parseInt(rgbMatch[2], 10));
    const b = Math.min(255, parseInt(rgbMatch[3], 10));
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    return shortenHex(hex);
  }

  // 6-digit hex -> 3-digit hex if duplicate characters
  if (/^#[0-9a-f]{6}$/.test(trimmed)) {
    return shortenHex(trimmed);
  }

  // Common named colors
  if (trimmed === 'white') return '#fff';
  if (trimmed === 'black') return '#000';

  return color;
}

function shortenHex(hex: string): string {
  if (
    hex.length === 7 &&
    hex[1] === hex[2] &&
    hex[3] === hex[4] &&
    hex[5] === hex[6]
  ) {
    return `#${hex[1]}${hex[3]}${hex[5]}`;
  }
  return hex;
}

/**
 * Strips comments from DOM node recursively
 */
function removeComments(node: Node) {
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const child = node.childNodes[i];
    if (child.nodeType === Node.COMMENT_NODE) {
      node.removeChild(child);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      removeComments(child);
    }
  }
}

/**
 * Remove editor metadata and unwanted elements
 */
function cleanMetadataElements(doc: Document) {
  const elementsToRemove = doc.querySelectorAll(
    'metadata, desc, title, rdf\\:RDF, [id^="Adobe_OpacityMask_"]'
  );
  elementsToRemove.forEach((el) => el.parentNode?.removeChild(el));

  // Remove empty defs
  doc.querySelectorAll('defs').forEach((defs) => {
    if (defs.children.length === 0 && (!defs.textContent || !defs.textContent.trim())) {
      defs.parentNode?.removeChild(defs);
    }
  });
}

/**
 * Sanitizes SVG markup to prevent XSS attacks by removing executable elements,
 * on* event handlers, and javascript: pseudo-protocols.
 */
export function sanitizeSvgMarkup(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent.trim(), 'image/svg+xml');
    if (doc.querySelector('parsererror')) {
      return '';
    }

    // Remove dangerous elements
    const dangerousTags = [
      'script',
      'foreignObject',
      'foreignobject',
      'iframe',
      'object',
      'embed',
      'meta',
      'link',
      'applet',
    ];
    dangerousTags.forEach((tag) => {
      doc.querySelectorAll(tag).forEach((el) => el.parentNode?.removeChild(el));
    });

    // Remove on* event attributes and javascript: URLs
    const allEls = doc.querySelectorAll('*');
    allEls.forEach((el) => {
      const toRemove: string[] = [];
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        const name = attr.name.toLowerCase();
        const val = attr.value.trim().toLowerCase();

        if (name.startsWith('on')) {
          toRemove.push(attr.name);
        } else if (
          (name === 'href' || name === 'xlink:href') &&
          (val.startsWith('javascript:') || val.startsWith('data:text/html'))
        ) {
          toRemove.push(attr.name);
        }
      }
      toRemove.forEach((a) => el.removeAttribute(a));
    });

    return new XMLSerializer().serializeToString(doc.documentElement);
  } catch {
    return svgContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/href\s*=\s*(['"])javascript:.*?\1/gi, '');
  }
}

/**
 * Collects all IDs referenced via url(#id), href="#id", or clip-path in the document.
 */
function getReferencedIds(doc: Document): Set<string> {
  const referenced = new Set<string>();
  const xml = doc.documentElement.innerHTML;
  const urlRegex = /url\(#([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(xml)) !== null) {
    referenced.add(match[1].trim());
  }

  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    for (let i = 0; i < el.attributes.length; i++) {
      const a = el.attributes[i];
      const val = a.value.trim();
      if ((a.name === 'href' || a.name === 'xlink:href') && val.startsWith('#')) {
        referenced.add(val.slice(1));
      }
      if (a.name === 'clip-path' || a.name === 'mask' || a.name === 'filter') {
        const m = val.match(/url\(#([^)]+)\)/);
        if (m) referenced.add(m[1].trim());
      }
    }
  });
  return referenced;
}

/**
 * Clean editor namespaces and attributes
 */
function cleanEditorAttributes(
  element: Element,
  cleanupIds: boolean,
  referencedIds?: Set<string>
) {
  const attrsToRemove: string[] = [];

  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    const name = attr.name.toLowerCase();

    // Editor namespaces and attributes
    if (
      name.startsWith('xmlns:sketch') ||
      name.startsWith('xmlns:inkscape') ||
      name.startsWith('xmlns:illustrator') ||
      name.startsWith('xmlns:sodipodi') ||
      name.startsWith('xmlns:i') ||
      name.startsWith('xmlns:serif') ||
      name.startsWith('xmlns:rdf') ||
      name.startsWith('xmlns:dc') ||
      name.startsWith('xmlns:cc') ||
      name.startsWith('inkscape:') ||
      name.startsWith('sodipodi:') ||
      name.startsWith('sketch:') ||
      name.startsWith('i:') ||
      name.startsWith('serif:') ||
      name === 'enable-background' ||
      name === 'xml:space' ||
      name === 'data-name'
    ) {
      attrsToRemove.push(attr.name);
    }

    // Empty attributes
    if (attr.value === '' && (name === 'style' || name === 'class' || name === 'id')) {
      attrsToRemove.push(attr.name);
    }

    // Cleanup generic and unreferenced IDs
    if (cleanupIds && name === 'id') {
      const idVal = attr.value;
      if (!referencedIds || !referencedIds.has(idVal)) {
        attrsToRemove.push(attr.name);
      }
    }
  }

  attrsToRemove.forEach((a) => element.removeAttribute(a));

  // Recurse children
  for (let i = 0; i < element.children.length; i++) {
    cleanEditorAttributes(element.children[i], cleanupIds, referencedIds);
  }
}

/**
 * Collapse useless groups (<g> with no attributes or redundant hierarchy)
 */
function collapseGroups(doc: Document) {
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 5) {
    changed = false;
    iterations++;

    const groups = doc.querySelectorAll('g');
    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i];
      const parent = g.parentNode;
      if (!parent) continue;

      const hasAttributes = g.attributes.length > 0;

      // Group with no children
      if (g.childNodes.length === 0) {
        parent.removeChild(g);
        changed = true;
        continue;
      }

      // Group with no attributes at all: hoist all children to parent
      if (!hasAttributes && parent.nodeName.toLowerCase() !== 'defs') {
        while (g.firstChild) {
          parent.insertBefore(g.firstChild, g);
        }
        parent.removeChild(g);
        changed = true;
      }
    }
  }
}

/**
 * Reduce coordinate precision across paths and shapes
 */
function optimizeCoordinates(doc: Document, precision: number, convertColors: boolean) {
  const coordinateAttributes = [
    'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2'
  ];

  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    // 1. Path data
    if (el.hasAttribute('d')) {
      const d = el.getAttribute('d')!;
      el.setAttribute('d', optimizePathData(d, precision));
    }

    // 2. Points on polygon/polyline
    if (el.hasAttribute('points')) {
      const points = el.getAttribute('points')!;
      el.setAttribute('points', optimizePathData(points, precision));
    }

    // 3. Coordinate attributes
    for (const attr of coordinateAttributes) {
      if (el.hasAttribute(attr)) {
        let val = el.getAttribute(attr)!;
        // strip 'px' suffix if present
        val = val.replace(/px$/i, '').trim();
        const num = parseFloat(val);
        if (!isNaN(num)) {
          el.setAttribute(attr, roundNumber(num, precision));
        }
      }
    }

    // 4. Color attributes
    if (convertColors) {
      ['fill', 'stroke', 'stop-color'].forEach((colorAttr) => {
        if (el.hasAttribute(colorAttr)) {
          const val = el.getAttribute(colorAttr)!;
          el.setAttribute(colorAttr, optimizeColor(val));
        }
      });
    }
  });
}

/**
 * Main optimization function
 */
export function optimizeSvg(
  svgContent: string,
  options: SvgOptimizerCleanerOptions
): SvgOptimizerCleanerResult {
  const validation = validateSvg(svgContent);
  if (!validation.isValid) {
    return {
      success: false,
      blob: new Blob([], { type: 'image/svg+xml' }),
      fileName: 'optimized.svg',
      fileSize: 0,
      mimeType: 'image/svg+xml',
      code: '',
      optimizedSvg: '',
      stats: {
        originalBytes: new TextEncoder().encode(svgContent || '').length,
        optimizedBytes: 0,
        savingsBytes: 0,
        savingsPercent: 0,
      },
      error: validation.error || 'Invalid SVG markup.',
    };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent.trim(), 'image/svg+xml');
    const svgRoot = doc.documentElement;

    // 0. Security sanitization pass: strip executable script tags, foreignObject, on* handlers
    const dangerousTags = [
      'script',
      'foreignObject',
      'foreignobject',
      'iframe',
      'object',
      'embed',
      'meta',
      'link',
      'applet',
    ];
    dangerousTags.forEach((tag) => {
      doc.querySelectorAll(tag).forEach((el) => el.parentNode?.removeChild(el));
    });

    const allElements = doc.querySelectorAll('*');
    allElements.forEach((el) => {
      const dangerousAttrs: string[] = [];
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        const aName = attr.name.toLowerCase();
        const aVal = attr.value.trim().toLowerCase();
        if (aName.startsWith('on')) {
          dangerousAttrs.push(attr.name);
        } else if (
          (aName === 'href' || aName === 'xlink:href') &&
          (aVal.startsWith('javascript:') || aVal.startsWith('data:text/html'))
        ) {
          dangerousAttrs.push(attr.name);
        }
      }
      dangerousAttrs.forEach((a) => el.removeAttribute(a));
    });

    // 1. Comments
    if (options.stripMetadataComments) {
      removeComments(doc);
      cleanMetadataElements(doc);
    }

    // 2. Editor attributes & IDs
    const referencedIds = getReferencedIds(doc);
    cleanEditorAttributes(svgRoot, options.cleanupIds, referencedIds);

    // 3. Collapse groups
    if (options.collapseUselessGroups) {
      collapseGroups(doc);
    }

    // 4. Dimensions & viewBox
    if (options.removeDimensionsForViewBox) {
      const hasViewBox = svgRoot.hasAttribute('viewBox');
      const hasWidth = svgRoot.hasAttribute('width');
      const hasHeight = svgRoot.hasAttribute('height');

      if (hasViewBox && hasWidth && hasHeight) {
        svgRoot.removeAttribute('width');
        svgRoot.removeAttribute('height');
      } else if (!hasViewBox && hasWidth && hasHeight) {
        const w = parseFloat(svgRoot.getAttribute('width')!.replace(/px$/i, ''));
        const h = parseFloat(svgRoot.getAttribute('height')!.replace(/px$/i, ''));
        if (!isNaN(w) && !isNaN(h)) {
          svgRoot.setAttribute('viewBox', `0 0 ${w} ${h}`);
          svgRoot.removeAttribute('width');
          svgRoot.removeAttribute('height');
        }
      }
    }

    // 5. Optimize Coordinates & Colors
    optimizeCoordinates(doc, options.floatPrecision, options.convertColorsToHex);

    // 6. Serialize and minify
    const serializer = new XMLSerializer();
    let optimized = serializer.serializeToString(doc);

    // Minify whitespace
    optimized = optimized
      .replace(/<\?xml[\s\S]*?\?>/gi, '')
      .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
      .replace(/>\s+</g, '><')
      .trim();

    const originalBytes = new TextEncoder().encode(svgContent).length;
    const optimizedBytes = new TextEncoder().encode(optimized).length;
    const savingsBytes = Math.max(0, originalBytes - optimizedBytes);
    const savingsPercent =
      originalBytes > 0
        ? parseFloat(((savingsBytes / originalBytes) * 100).toFixed(1))
        : 0;

    const stats: SvgOptimizationStats = {
      originalBytes,
      optimizedBytes,
      savingsBytes,
      savingsPercent,
      originalNodeCount: (svgContent.match(/<[a-zA-Z]/g) || []).length,
      optimizedNodeCount: (optimized.match(/<[a-zA-Z]/g) || []).length,
    };

    const code = generateExportCode(
      optimized,
      options.codeExportFormat,
      options.componentName || 'CustomSvgIcon'
    );

    let mimeType = 'image/svg+xml';
    let fileExtension = 'svg';

    if (options.codeExportFormat === 'react_tsx') {
      mimeType = 'text/typescript';
      fileExtension = 'tsx';
    } else if (options.codeExportFormat === 'vue_sfc') {
      mimeType = 'text/plain';
      fileExtension = 'vue';
    } else if (options.codeExportFormat === 'svelte') {
      mimeType = 'text/plain';
      fileExtension = 'svelte';
    } else if (options.codeExportFormat === 'data_uri') {
      mimeType = 'text/plain';
      fileExtension = 'txt';
    }

    const cleanName = (options.componentName || 'optimized')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
    const fileName = `${cleanName}.${fileExtension}`;
    const blob = new Blob([options.codeExportFormat === 'svg' ? optimized : code], {
      type: mimeType,
    });

    return {
      success: true,
      blob,
      fileName,
      fileSize: blob.size,
      mimeType,
      code,
      optimizedSvg: optimized,
      stats,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Optimization error';
    return {
      success: false,
      blob: new Blob([], { type: 'image/svg+xml' }),
      fileName: 'error.svg',
      fileSize: 0,
      mimeType: 'image/svg+xml',
      code: '',
      optimizedSvg: '',
      stats: {
        originalBytes: new TextEncoder().encode(svgContent).length,
        optimizedBytes: 0,
        savingsBytes: 0,
        savingsPercent: 0,
      },
      error: message,
    };
  }
}

/**
 * Convert SVG kebab-case attributes to React JSX camelCase
 */
function convertSvgToReactJsx(svg: string): string {
  const attrMap: Record<string, string> = {
    'stroke-width': 'strokeWidth',
    'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin',
    'stroke-miterlimit': 'strokeMiterlimit',
    'stroke-dasharray': 'strokeDasharray',
    'stroke-dashoffset': 'strokeDashoffset',
    'stroke-opacity': 'strokeOpacity',
    'fill-rule': 'fillRule',
    'fill-opacity': 'fillOpacity',
    'clip-rule': 'clipRule',
    'clip-path': 'clipPath',
    'stop-color': 'stopColor',
    'stop-opacity': 'stopOpacity',
    'font-family': 'fontFamily',
    'font-size': 'fontSize',
    'font-weight': 'fontWeight',
    'text-anchor': 'textAnchor',
    'xlink:href': 'xlinkHref',
    'xmlns:xlink': 'xmlnsXlink',
    class: 'className',
  };

  let reactSvg = svg;

  for (const [kebab, camel] of Object.entries(attrMap)) {
    const reg = new RegExp(`\\b${kebab}=`, 'g');
    reactSvg = reactSvg.replace(reg, `${camel}=`);
  }

  // Inject {...props} into root <svg>
  reactSvg = reactSvg.replace(/<svg\b([^>]*)>/, '<svg$1 {...props}>');

  return reactSvg;
}

/**
 * Generate code in target framework format
 */
export function generateExportCode(
  svgContent: string,
  format: CodeExportFormat,
  componentName: string
): string {
  const safeName = componentName
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/^[0-9]/, '_') || 'SvgIcon';

  switch (format) {
    case 'svg':
      return svgContent;

    case 'react_tsx': {
      const jsx = convertSvgToReactJsx(svgContent);
      return `import React from 'react';

export const ${safeName}: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  ${jsx}
);

export default ${safeName};
`;
    }

    case 'vue_sfc': {
      return `<template>
  ${svgContent}
</template>

<script setup lang="ts">
// Component: ${safeName}
</script>
`;
    }

    case 'svelte': {
      const svelteSvg = svgContent.replace(/<svg\b([^>]*)>/, '<svg$1 {...$$$$restProps}>');
      return svelteSvg;
    }

    case 'data_uri': {
      const encoded = encodeURIComponent(svgContent)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
      return `data:image/svg+xml;utf8,${encoded}`;
    }

    default:
      return svgContent;
  }
}
