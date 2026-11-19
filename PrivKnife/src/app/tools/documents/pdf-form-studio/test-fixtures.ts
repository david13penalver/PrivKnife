import { PDFDocument, PDFName, rgb, StandardFonts } from 'pdf-lib';
import { PdfFormCompileOptions } from './types';

export const DEFAULT_COMPILE_OPTIONS: PdfFormCompileOptions = {
  flatten: false,
  fontFamily: 'helvetica',
  outputFileName: 'form.pdf',
};

export async function createSampleAcroFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const page0 = doc.addPage([595, 842]);
  const page1 = doc.addPage([595, 842]);

  page0.drawText('PrivKnife Application Form - Page 1', {
    x: 48,
    y: 785,
    size: 16,
    font,
    color: rgb(0.1, 0.1, 0.2),
  });
  page1.drawText('PrivKnife Application Form - Page 2', {
    x: 48,
    y: 785,
    size: 16,
    font,
    color: rgb(0.1, 0.1, 0.2),
  });

  const form = doc.getForm();

  const fullName = form.createTextField('full_name');
  fullName.setMaxLength(40);
  fullName.setText('Jane Doe');
  fullName.addToPage(page0, { x: 48, y: 710, width: 260, height: 24 });

  const notes = form.createTextField('notes');
  notes.enableMultiline();
  notes.addToPage(page0, { x: 48, y: 590, width: 320, height: 80 });

  const agreeTerms = form.createCheckBox('agree_terms');
  agreeTerms.addToPage(page0, { x: 48, y: 540, width: 18, height: 18 });

  const country = form.createDropdown('country');
  country.addOptions(['USA', 'Spain', 'Germany']);
  country.select('USA');
  country.addToPage(page0, { x: 48, y: 480, width: 200, height: 26 });

  const plan = form.createRadioGroup('plan');
  plan.addOptionToPage('Free', page0, { x: 48, y: 420, width: 18, height: 18 });
  plan.addOptionToPage('Pro', page0, { x: 140, y: 420, width: 18, height: 18 });
  plan.select('Free');

  const readOnlyId = form.createTextField('read_only_id');
  readOnlyId.setText('ID-001');
  readOnlyId.enableReadOnly();
  readOnlyId.addToPage(page1, { x: 48, y: 710, width: 180, height: 24 });

  const secondaryNote = form.createTextField('secondary_note');
  secondaryNote.addToPage(page1, { x: 48, y: 650, width: 300, height: 24 });

  form.updateFieldAppearances(font);
  return new Uint8Array(await doc.save());
}

export async function createFlatPdf(pageCount = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const p = doc.addPage([595, 842]);
    p.drawText(`Flat Document Page ${i + 1}`, {
      x: 48,
      y: 770,
      size: 16,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return new Uint8Array(await doc.save());
}

export async function createSyntheticXfaPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]);
  const form = doc.getForm();
  form.createTextField('legacy_field').addToPage(doc.getPage(0), {
    x: 40,
    y: 700,
    width: 180,
    height: 24,
  });
  form.acroForm.dict.set(PDFName.of('XFA_TAG'), doc.context.obj([]));
  const raw = new Uint8Array(await doc.save({ useObjectStreams: false }));
  const text = new TextDecoder('latin1').decode(raw).replace('/XFA_TAG', '/XFA   ');
  return Uint8Array.from(text, (ch) => ch.charCodeAt(0));
}

export function createCorruptPdfBytes(): Uint8Array {
  const s = '%PDF-1.7\n%truncated corrupt AcroForm\n';
  return Uint8Array.from(s, (ch) => ch.charCodeAt(0));
}

export function createNonPdfBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}
