import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generate a synthetic valid PDF document buffer with the specified number of pages for tests.
 */
export async function createTestPdfBuffer(pageCount = 1, title = 'Test Document'): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions
    page.drawText(`${title} - Page ${i + 1}`, {
      x: 50,
      y: 800,
      size: 20,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer as ArrayBuffer;
}
