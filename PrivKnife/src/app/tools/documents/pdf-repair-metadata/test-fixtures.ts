import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';

export const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export function getTinyPngBytes(): Uint8Array {
  const binary = atob(TINY_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function createFakePngBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
}

export function createFakeZipBytes(): Uint8Array {
  return new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00]);
}

const SAMPLE_XMP_XML = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Annual Report 2025</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>John Doe</rdf:li></rdf:Seq></dc:creator>
      <xmp:CreatorTool>Microsoft Word</xmp:CreatorTool>
      <pdf:Producer>Legacy Suite</pdf:Producer>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

function attachSampleXmpAndPieceInfo(pdfDoc: PDFDocument): void {
  const encoded = new TextEncoder().encode(SAMPLE_XMP_XML);
  const xmpBytes = new Uint8Array(encoded.byteLength);
  xmpBytes.set(encoded);
  const xmpStream = pdfDoc.context.stream(xmpBytes, {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
  });
  const xmpRef = pdfDoc.context.register(xmpStream);
  pdfDoc.catalog.set(PDFName.of('Metadata'), xmpRef);

  const pieceDict = pdfDoc.context.obj({
    PrivateApp: PDFString.of('InternalDesktopUser123'),
  });
  pdfDoc.catalog.set(PDFName.of('PieceInfo'), pdfDoc.context.register(pieceDict));
}

export async function createHealthySamplePdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page1 = pdfDoc.addPage([595, 842]);
  page1.drawText('PrivKnife Archival Record - Page 1', { x: 50, y: 780, size: 16, font });
  const page2 = pdfDoc.addPage([595, 842]);
  page2.drawText('PrivKnife Archival Record - Page 2', { x: 50, y: 780, size: 16, font });

  pdfDoc.setTitle('Annual Report 2025');
  pdfDoc.setAuthor('John Doe');
  pdfDoc.setSubject('Financial & Compliance Record');
  pdfDoc.setKeywords(['audit', 'finance', 'privacy']);
  pdfDoc.setCreator('Microsoft Word');
  pdfDoc.setProducer('Legacy Suite');

  attachSampleXmpAndPieceInfo(pdfDoc);
  return pdfDoc.save({ useObjectStreams: false });
}

function injectGarbageAndCorruptXref(rawBytes: Uint8Array): Uint8Array {
  // Corrupt classic xref entry offsets in latin1 representation (keeping byte length unchanged)
  const latin1 = Array.from(rawBytes, (b) => String.fromCharCode(b)).join('');
  const xrefPos = latin1.lastIndexOf('\nxref\n');
  let corruptedStr = latin1;
  if (xrefPos >= 0) {
    const before = latin1.slice(0, xrefPos);
    let xrefTail = latin1.slice(xrefPos);
    // Bump first non-zero object offset by +47 bytes
    let replaced = false;
    xrefTail = xrefTail.replace(
      /(\n)(\d{10})(\s+00000\s+n\b)/g,
      (full, lead: string, digits: string, suffix: string) => {
        if (!replaced && Number(digits) > 0) {
          replaced = true;
          const broken = String(Number(digits) + 47).padStart(10, '0');
          return `${lead}${broken}${suffix}`;
        }
        return full;
      }
    );
    corruptedStr = before + xrefTail;
  }

  const corruptedBody = new Uint8Array(corruptedStr.length);
  for (let i = 0; i < corruptedStr.length; i++) {
    corruptedBody[i] = corruptedStr.charCodeAt(i) & 0xff;
  }

  // Exact 32 bytes leading garbage
  const garbageText = 'JUNK-HEADER-0123456789-CORRUPT!!';
  const garbageBytes = new TextEncoder().encode(garbageText);
  const merged = new Uint8Array(garbageBytes.length + corruptedBody.length);
  merged.set(garbageBytes, 0);
  merged.set(corruptedBody, garbageBytes.length);
  return merged;
}

export async function createCorruptedXrefAndGarbagePdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([595, 842]);
  page.drawText('Damaged PDF Recovery Payload', { x: 50, y: 760, size: 15, font });
  pdfDoc.setTitle('Corrupted Report');
  pdfDoc.setAuthor('Legacy Export');
  const validBytes = await pdfDoc.save({ useObjectStreams: false });
  return injectGarbageAndCorruptXref(validBytes);
}

export async function createJavaScriptActionPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([595, 842]);
  page.drawText('Document Containing Embedded JavaScript Action', {
    x: 50,
    y: 760,
    size: 14,
    font,
  });

  pdfDoc.setTitle('Action Policy Draft');
  pdfDoc.setAuthor('John Doe');
  pdfDoc.setCreator('Microsoft Word');
  pdfDoc.setProducer('Acrobat Distiller');
  attachSampleXmpAndPieceInfo(pdfDoc);

  const jsActionDict = pdfDoc.context.obj({
    Type: PDFName.of('Action'),
    S: PDFName.of('JavaScript'),
    JS: PDFString.of('app.alert("xss");'),
  });
  const jsActionRef = pdfDoc.context.register(jsActionDict);
  pdfDoc.catalog.set(PDFName.of('OpenAction'), jsActionRef);

  const jsTree = pdfDoc.context.obj({
    Names: [PDFString.of('StartupScript'), jsActionRef],
  });
  const namesDict = pdfDoc.context.obj({
    JavaScript: pdfDoc.context.register(jsTree),
  });
  pdfDoc.catalog.set(PDFName.of('Names'), pdfDoc.context.register(namesDict));

  return pdfDoc.save({ useObjectStreams: false });
}

export async function createCombinedDiagnosticSamplePdf(): Promise<Uint8Array> {
  const withJs = await createJavaScriptActionPdf();
  return injectGarbageAndCorruptXref(withJs);
}
