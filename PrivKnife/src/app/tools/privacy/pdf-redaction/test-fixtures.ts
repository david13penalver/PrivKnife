import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generate a synthetic PDF containing confidential test text and metadata.
 */
export async function createSensitiveTestPdfBuffer(): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('Confidential Tax Return');
  pdfDoc.setAuthor('John Doe');
  pdfDoc.setProducer('IRS Tax Form Generator');

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([600, 800]);

  page.drawText('W2 Wage and Tax Statement', {
    x: 50,
    y: 750,
    size: 24,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText('Social Security Number: 123-45-6789', {
    x: 50,
    y: 700,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText('Annual Wage: $145,000.00', {
    x: 50,
    y: 660,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer as ArrayBuffer;
}
