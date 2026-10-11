import DOMPurify from 'dompurify';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import { CheatsheetConfig } from './types';

// DOMPurify factory wrapper for safe execution in both browser and test environments
function getPurifier(): { sanitize: (source: string, config?: any) => string } {
  if (DOMPurify && typeof (DOMPurify as any).sanitize === 'function') {
    return DOMPurify as any;
  }
  const win = typeof window !== 'undefined' ? window : (globalThis as any).window;
  if (typeof DOMPurify === 'function' && win) {
    return (DOMPurify as any)(win);
  }
  return {
    sanitize: (str: string) =>
      str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
  };
}

/**
 * Parses markdown into safe, sanitized HTML using marked.js and DOMPurify.
 */
export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  const purifier = getPurifier();

  return purifier.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'hr',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'del',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'a',
      'span',
      'div',
      'mark',
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'style', 'title'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Wraps parsed markdown in a CSS multi-column cheatsheet layout simulating print output.
 */
export function generateCheatsheetPreviewHtml(config: CheatsheetConfig): string {
  const contentHtml = renderMarkdownToHtml(config.markdownContent);
  const titleHtml = config.title ? escapeHtml(config.title) : 'Cheatsheet';
  const subtitleHtml = config.subtitle ? escapeHtml(config.subtitle) : '';

  const footerHtml = config.includeFooter
    ? `<footer class="cs-footer" style="margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between;">
        <span>Generated with PrivKnife &bull; 100% Client-Side</span>
        <span>Page 1</span>
       </footer>`
    : '';

  return `
<div class="cs-sheet-wrapper" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #ffffff; padding: 24px; box-sizing: border-box;">
  <header class="cs-header" style="margin-bottom: 14px; border-bottom: 2px solid ${config.accentColor}; padding-bottom: 6px;">
    <h1 style="margin: 0; font-size: 16pt; font-weight: 800; color: ${config.accentColor}; line-height: 1.2;">
      ${titleHtml}
    </h1>
    ${
      subtitleHtml
        ? `<div style="font-size: 9pt; color: #64748b; margin-top: 3px;">${subtitleHtml}</div>`
        : ''
    }
  </header>

  <div class="cs-columns-body" style="column-count: ${config.columns}; column-gap: 16px; column-rule: 1px solid #e2e8f0; font-size: ${config.fontSizePt}pt; line-height: 1.4;">
    ${contentHtml}
  </div>

  ${footerHtml}
</div>
`;
}

/**
 * Helper to convert hex color to RGB tuple
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    return [r, g, b];
  }
  const num = parseInt(clean, 16) || 0;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

interface ParsedBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'code' | 'list' | 'quote' | 'table';
  text: string;
  rows?: string[][];
}

/**
 * Simple markdown block tokenizer for vector PDF rendering
 */
function tokenizeMarkdown(md: string): ParsedBlock[] {
  const lines = md.split(/\r?\n/);
  const blocks: ParsedBlock[] = [];

  let inCode = false;
  let codeBuffer: string[] = [];
  let tableBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCode) {
        blocks.push({ type: 'code', text: codeBuffer.join('\n') });
        codeBuffer = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (trimmed.startsWith('|')) {
      tableBuffer.push(trimmed);
      if (i === lines.length - 1 || !lines[i + 1].trim().startsWith('|')) {
        const rows = tableBuffer
          .filter((row) => !row.includes('---'))
          .map((row) =>
            row
              .split('|')
              .slice(1, -1)
              .map((cell) => cell.trim())
          );
        blocks.push({ type: 'table', text: '', rows });
        tableBuffer = [];
      }
      continue;
    }

    if (!trimmed) continue;

    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.replace(/^#\s+/, '') });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.replace(/^##\s+/, '') });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.replace(/^###\s+/, '') });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push({ type: 'list', text: trimmed.replace(/^[-*]\s+/, '') });
    } else if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'quote', text: trimmed.replace(/^>\s+/, '') });
    } else {
      blocks.push({ type: 'p', text: trimmed });
    }
  }

  if (inCode && codeBuffer.length > 0) {
    blocks.push({ type: 'code', text: codeBuffer.join('\n') });
  }

  return blocks;
}

/**
 * Builds a vector-sharp multi-column PDF using jsPDF.
 */
export function generateCheatsheetPdf(config: CheatsheetConfig): jsPDF {
  const pdf = new jsPDF({
    format: config.paperSize,
    orientation: config.orientation,
    unit: 'mm',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const numCols = config.columns;
  const colGap = 5;
  const colWidth = (usableWidth - colGap * (numCols - 1)) / numCols;

  const [accentR, accentG, accentB] = hexToRgb(config.accentColor);

  // Top Accent Bar
  pdf.setFillColor(accentR, accentG, accentB);
  pdf.rect(margin, 8, usableWidth, 2, 'F');

  // Title
  pdf.setTextColor(accentR, accentG, accentB);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(config.title || 'Cheatsheet', margin, 15);

  // Subtitle
  let headerBottom = 17;
  if (config.subtitle) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(config.subtitle, margin, 19.5);
    headerBottom = 22;
  }

  // Header separator
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(margin, headerBottom, pageWidth - margin, headerBottom);

  const startY = headerBottom + 4;
  const maxY = pageHeight - margin - (config.includeFooter ? 6 : 0);

  let currentCol = 0;
  let currentY = startY;

  const blocks = tokenizeMarkdown(config.markdownContent);

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > maxY) {
      currentCol++;
      currentY = startY;
      if (currentCol >= numCols) {
        pdf.addPage();
        currentCol = 0;
        currentY = margin + 4;
      }
    }
  };

  const getColX = () => margin + currentCol * (colWidth + colGap);

  for (const block of blocks) {
    const colX = getColX();

    switch (block.type) {
      case 'h1':
      case 'h2': {
        checkPageBreak(8);
        const colX = getColX();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(config.fontSizePt + 1.5);
        pdf.setTextColor(accentR, accentG, accentB);
        pdf.text(block.text, colX, currentY + 3);
        pdf.setDrawColor(accentR, accentG, accentB);
        pdf.setLineWidth(0.4);
        pdf.line(colX, currentY + 4, colX + colWidth, currentY + 4);
        currentY += 7;
        break;
      }

      case 'h3': {
        checkPageBreak(6);
        const colX = getColX();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(config.fontSizePt + 0.5);
        pdf.setTextColor(30, 41, 59);
        pdf.text(block.text, colX, currentY + 3);
        currentY += 5;
        break;
      }

      case 'code': {
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(config.fontSizePt - 1);
        const lines = pdf.splitTextToSize(block.text, colWidth - 4);
        const blockHeight = lines.length * 3 + 4;
        checkPageBreak(blockHeight + 2);
        const colX = getColX();

        // Draw light background
        pdf.setFillColor(241, 245, 249);
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.2);
        pdf.roundedRect(colX, currentY, colWidth, blockHeight, 1, 1, 'FD');

        pdf.setTextColor(15, 23, 42);
        pdf.text(lines, colX + 2, currentY + 3.5);
        currentY += blockHeight + 2;
        break;
      }

      case 'quote': {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(config.fontSizePt);
        const lines = pdf.splitTextToSize(block.text, colWidth - 4);
        const quoteHeight = lines.length * 3.5 + 2;
        checkPageBreak(quoteHeight + 2);
        const colX = getColX();

        pdf.setDrawColor(accentR, accentG, accentB);
        pdf.setLineWidth(0.8);
        pdf.line(colX, currentY, colX, currentY + quoteHeight);

        pdf.setTextColor(71, 85, 105);
        pdf.text(lines, colX + 3, currentY + 3);
        currentY += quoteHeight + 2;
        break;
      }

      case 'list': {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(config.fontSizePt);
        const lines = pdf.splitTextToSize(block.text, colWidth - 4);
        const listHeight = lines.length * 3.5;
        checkPageBreak(listHeight + 1);
        const colX = getColX();

        // Draw bullet
        pdf.setFillColor(accentR, accentG, accentB);
        pdf.circle(colX + 1, currentY + 1.8, 0.5, 'F');

        pdf.setTextColor(30, 41, 59);
        pdf.text(lines, colX + 3, currentY + 2.5);
        currentY += listHeight + 1;
        break;
      }

      case 'table': {
        if (!block.rows || block.rows.length === 0) break;
        const numTableCols = block.rows[0].length || 1;
        const cellWidth = colWidth / numTableCols;
        const tableHeight = block.rows.length * 4 + 2;
        checkPageBreak(tableHeight);
        const colX = getColX();

        pdf.setFontSize(config.fontSizePt - 1.5);

        for (let r = 0; r < block.rows.length; r++) {
          const rowY = currentY + r * 4;
          const isHeader = r === 0;

          if (isHeader) {
            pdf.setFillColor(accentR, accentG, accentB);
            pdf.rect(colX, rowY, colWidth, 4, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
          } else {
            pdf.setFillColor(r % 2 === 0 ? 248 : 255, r % 2 === 0 ? 250 : 255, r % 2 === 0 ? 252 : 255);
            pdf.rect(colX, rowY, colWidth, 4, 'F');
            pdf.setTextColor(30, 41, 59);
            pdf.setFont('helvetica', 'normal');
          }

          for (let c = 0; c < numTableCols; c++) {
            const cellText = block.rows[r][c] || '';
            const cellX = colX + c * cellWidth + 1;
            pdf.text(cellText, cellX, rowY + 2.8, { maxWidth: cellWidth - 1 });
          }
        }

        currentY += tableHeight + 2;
        break;
      }

      case 'p':
      default: {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(config.fontSizePt);
        const lines = pdf.splitTextToSize(block.text, colWidth);
        const pHeight = lines.length * 3.5;
        checkPageBreak(pHeight + 1);
        const colX = getColX();

        pdf.setTextColor(30, 41, 59);
        pdf.text(lines, colX, currentY + 2.5);
        currentY += pHeight + 2;
        break;
      }
    }
  }

  // Footers
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    if (config.includeFooter) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);
      pdf.text('Generated with PrivKnife • 100% Client-Side', margin, pageHeight - 5);
      pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }
  }

  return pdf;
}

/**
 * Exports vector PDF as application/pdf Blob.
 */
export function exportCheatsheetPdfBlob(config: CheatsheetConfig): Blob {
  const doc = generateCheatsheetPdf(config);
  return doc.output('blob');
}
