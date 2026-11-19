import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  buildFormOutputFileName,
  compileFormPdf,
  ensureUniqueFieldName,
  inspectPdfForm,
  parseFormSnapshot,
  pdfWidgetRectToPercent,
  sanitizeTextForWinAnsi,
  serializeFormSnapshot,
} from './engine';
import {
  createCorruptPdfBytes,
  createFlatPdf,
  createNonPdfBytes,
  createSampleAcroFormPdf,
  createSyntheticXfaPdf,
  DEFAULT_COMPILE_OPTIONS,
} from './test-fixtures';
import { PdfFormFieldModel } from './types';

describe('Interactive PDF Form Studio Engine (Seam 1)', () => {
  describe('Slice 1: Coordinate Mapping, Unique Field Naming, WinAnsi Sanitizer & JSON Snapshot Codec', () => {
    it('maps PDF bottom-left widget coordinates to clamped CSS top-left percentages', () => {
      const pct = pdfWidgetRectToPercent(
        { x: 60, y: 720, width: 150, height: 40 },
        { x: 10, y: 20, width: 500, height: 800 }
      );
      // relX = 50 -> 10%; topFromTop = 820 - 760 = 60 -> 7.5%; w = 30%; h = 5%
      expect(pct.xPct).toBeCloseTo(10, 2);
      expect(pct.yPct).toBeCloseTo(7.5, 2);
      expect(pct.wPct).toBeCloseTo(30, 2);
      expect(pct.hPct).toBeCloseTo(5, 2);

      // Out-of-bounds widgets clamp cleanly to [0, 100]
      const clamped = pdfWidgetRectToPercent(
        { x: -20, y: 900, width: 800, height: 200 },
        { x: 0, y: 0, width: 500, height: 800 }
      );
      expect(clamped.xPct).toBe(0);
      expect(clamped.yPct).toBe(0);
      expect(clamped.wPct).toBe(100);
      expect(clamped.hPct).toBe(25);
    });

    it('generates unique field names across duplicates and blank inputs', () => {
      const used = new Set<string>(['email', 'email_2', 'field']);
      expect(ensureUniqueFieldName('  email ', used)).toBe('email_3');
      expect(ensureUniqueFieldName('', used)).toBe('field_2');
      expect(ensureUniqueFieldName('phone_number', used)).toBe('phone_number');
      expect(used.has('email_3')).toBe(true);
      expect(used.has('field_2')).toBe(true);
    });

    it('preserves WinAnsi Latin/Euro characters and safely replaces unsupported Unicode symbols', () => {
      const clean = sanitizeTextForWinAnsi('José García — 120€');
      expect(clean.text).toBe('José García — 120€');
      expect(clean.hadUnsupportedChars).toBe(false);

      const mixed = sanitizeTextForWinAnsi('Hello 🚀 北京!');
      expect(mixed.text).toBe('Hello ? ??!');
      expect(mixed.hadUnsupportedChars).toBe(true);
    });

    it('round-trips JSON snapshots and blocks malformed or prototype-polluting keys', () => {
      const fields: PdfFormFieldModel[] = [
        {
          id: 'f1',
          name: 'full_name',
          kind: 'text',
          isNew: false,
          readOnly: false,
          required: false,
          value: 'Alice',
          placements: [],
        },
        {
          id: 'f2',
          name: 'agree',
          kind: 'checkbox',
          isNew: false,
          readOnly: false,
          required: false,
          value: true,
          placements: [],
        },
      ];

      const json = serializeFormSnapshot(fields);
      const parsed = parseFormSnapshot(json);
      expect(parsed.valid).toBe(true);
      expect(parsed.values).toEqual({ full_name: 'Alice', agree: true });

      const evilJson =
        '{"full_name":"Bob","agree":false,"__proto__":{"polluted":true},"nested":{"bad":1},"constructor":"evil"}';
      const sanitized = parseFormSnapshot(evilJson);
      expect(sanitized.valid).toBe(true);
      expect(sanitized.values).toEqual({ full_name: 'Bob', agree: false });
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();

      expect(parseFormSnapshot('{not-json').valid).toBe(false);
    });

    it('builds sanitized output filenames for editable vs flattened forms', () => {
      expect(buildFormOutputFileName('../../taxes/W9_2026.PDF', false)).toBe(
        'W9_2026-filled.pdf'
      );
      expect(buildFormOutputFileName('intake.pdf', true)).toBe(
        'intake-flattened.pdf'
      );
      expect(buildFormOutputFileName('  ', true)).toBe('document-flattened.pdf');
    });
  });

  describe('Slice 2: Real pdf-lib AcroForm Inspection, Filling, Creation, Flattening & Guards', () => {
    it('inspects multi-page AcroForm fields, multi-widget radios, readOnly flags, and XFA forms', async () => {
      const sampleBytes = await createSampleAcroFormPdf();
      const info = await inspectPdfForm(sampleBytes);

      expect(info.pageCount).toBe(2);
      expect(info.hasXfa).toBe(false);
      expect(info.fields).toHaveLength(7);

      const fullName = info.fields.find((f) => f.name === 'full_name')!;
      expect(fullName.kind).toBe('text');
      expect(fullName.value).toBe('Jane Doe');
      expect(fullName.maxLength).toBe(40);
      expect(fullName.placements[0].pageIndex).toBe(0);
      expect(fullName.placements[0].xPct).toBeGreaterThan(0);

      const notes = info.fields.find((f) => f.name === 'notes')!;
      expect(notes.kind).toBe('textarea');

      const agree = info.fields.find((f) => f.name === 'agree_terms')!;
      expect(agree.kind).toBe('checkbox');
      expect(agree.value).toBe(false);

      const country = info.fields.find((f) => f.name === 'country')!;
      expect(country.kind).toBe('dropdown');
      expect(country.options).toEqual(['USA', 'Spain', 'Germany']);

      const plan = info.fields.find((f) => f.name === 'plan')!;
      expect(plan.kind).toBe('radio');
      expect(plan.placements).toHaveLength(2);
      expect(plan.placements[0].pageIndex).toBe(0);

      const readOnlyId = info.fields.find((f) => f.name === 'read_only_id')!;
      expect(readOnlyId.readOnly).toBe(true);
      expect(readOnlyId.placements[0].pageIndex).toBe(1);

      const xfaBytes = await createSyntheticXfaPdf();
      const xfaInfo = await inspectPdfForm(xfaBytes);
      expect(xfaInfo.hasXfa).toBe(true);
    });

    it('populates fields (with maxLength + emoji warning), exports editable, and flattens cleanly', async () => {
      const sampleBytes = await createSampleAcroFormPdf();
      const inspected = await inspectPdfForm(sampleBytes);

      const updated: PdfFormFieldModel[] = inspected.fields.map((f) => {
        if (f.name === 'full_name') {
          return {
            ...f,
            value: 'Alicia 🚀 ' + 'A'.repeat(50),
          };
        }
        if (f.name === 'notes') return { ...f, value: 'Line 1\nLine 2' };
        if (f.name === 'agree_terms') return { ...f, value: true };
        if (f.name === 'country') return { ...f, value: 'Spain' };
        if (f.name === 'plan') return { ...f, value: 'Pro' };
        return f;
      });

      const editableRes = await compileFormPdf(sampleBytes, updated, {
        ...DEFAULT_COMPILE_OPTIONS,
        flatten: false,
        outputFileName: 'w9.pdf',
      });

      expect(editableRes.success).toBe(true);
      expect(editableRes.flattened).toBe(false);
      expect(editableRes.fileName).toBe('w9-filled.pdf');
      expect(editableRes.warnings?.length).toBeGreaterThan(0);

      const reloaded = await PDFDocument.load(editableRes.bytes!);
      const reloadedForm = reloaded.getForm();
      expect(reloadedForm.getFields().length).toBe(7);
      expect(reloadedForm.getTextField('full_name').getText()?.length).toBeLessThanOrEqual(40);
      expect(reloadedForm.getCheckBox('agree_terms').isChecked()).toBe(true);
      expect(reloadedForm.getDropdown('country').getSelected()).toEqual(['Spain']);
      expect(reloadedForm.getRadioGroup('plan').getSelected()).toBe('Pro');

      // Clear dropdown cleanly
      const clearedFields = updated.map((f) =>
        f.name === 'country' ? { ...f, value: '' } : f
      );
      const clearedRes = await compileFormPdf(sampleBytes, clearedFields, {
        ...DEFAULT_COMPILE_OPTIONS,
        flatten: false,
      });
      expect(clearedRes.success).toBe(true);
      const reloadedCleared = await PDFDocument.load(clearedRes.bytes!);
      expect(reloadedCleared.getForm().getDropdown('country').getSelected()).toEqual([]);

      // Flattened export burns appearances and removes interactive fields
      const progressEvents: number[] = [];
      const flatRes = await compileFormPdf(
        sampleBytes,
        updated,
        {
          ...DEFAULT_COMPILE_OPTIONS,
          flatten: true,
          outputFileName: 'w9.pdf',
        },
        { onProgress: (pct) => progressEvents.push(pct) }
      );
      expect(flatRes.success).toBe(true);
      expect(flatRes.flattened).toBe(true);
      expect(flatRes.fileName).toBe('w9-flattened.pdf');
      expect(progressEvents.at(-1)).toBe(100);

      const flatDoc = await PDFDocument.load(flatRes.bytes!);
      expect(flatDoc.getPageCount()).toBe(2);
      expect(flatDoc.getForm().getFields()).toHaveLength(0);
    });

    it('creates new AcroForm fields on a flat PDF with duplicate-name protection and safe zero-field flatten', async () => {
      const flatBytes = await createFlatPdf(1);

      const newFields: PdfFormFieldModel[] = [
        {
          id: 'n1',
          name: 'applicant_name',
          kind: 'text',
          isNew: true,
          readOnly: false,
          required: false,
          value: 'Carlos Mendez',
          fontSizePt: 12,
          placements: [{ pageIndex: 0, x: 72, y: 660, width: 220, height: 26 }],
        },
        {
          id: 'n2',
          name: 'applicant_name', // intentional duplicate -> becomes applicant_name_2
          kind: 'checkbox',
          isNew: true,
          readOnly: false,
          required: false,
          value: true,
          placements: [{ pageIndex: 0, x: 72, y: 610, width: 18, height: 18 }],
        },
        {
          id: 'n3',
          name: 'role',
          kind: 'dropdown',
          isNew: true,
          readOnly: false,
          required: false,
          value: 'Reviewer',
          options: ['Viewer', 'Reviewer'],
          placements: [{ pageIndex: 0, x: 72, y: 550, width: 180, height: 24 }],
        },
        {
          id: 'n4',
          name: 'tier',
          kind: 'radio',
          isNew: true,
          readOnly: false,
          required: false,
          value: 'B',
          options: ['A', 'B'],
          placements: [
            { pageIndex: 0, x: 72, y: 490, width: 18, height: 18 },
            { pageIndex: 0, x: 140, y: 490, width: 18, height: 18 },
          ],
        },
      ];

      const createdRes = await compileFormPdf(flatBytes, newFields, {
        ...DEFAULT_COMPILE_OPTIONS,
        flatten: false,
      });

      expect(createdRes.success).toBe(true);
      expect(createdRes.fieldsCreated).toBe(4);
      const doc = await PDFDocument.load(createdRes.bytes!);
      const names = doc.getForm().getFields().map((f) => f.getName());
      expect(names).toContain('applicant_name');
      expect(names).toContain('applicant_name_2');
      expect(names).toContain('role');
      expect(names).toContain('tier');
      expect(doc.getForm().getTextField('applicant_name').getText()).toBe('Carlos Mendez');
      expect(doc.getForm().getCheckBox('applicant_name_2').isChecked()).toBe(true);
      expect(doc.getForm().getDropdown('role').getSelected()).toEqual(['Reviewer']);
      expect(doc.getForm().getRadioGroup('tier').getSelected()).toBe('B');

      // Flattening flat PDF with zero fields succeeds cleanly
      const zeroFlatten = await compileFormPdf(flatBytes, [], {
        ...DEFAULT_COMPILE_OPTIONS,
        flatten: true,
      });
      expect(zeroFlatten.success).toBe(true);
      expect(zeroFlatten.flattened).toBe(true);
    });

    it('rejects empty, non-PDF, and corrupt buffers safely', async () => {
      await expect(inspectPdfForm(new Uint8Array(0))).rejects.toThrow();
      await expect(inspectPdfForm(createNonPdfBytes())).rejects.toThrow();
      await expect(inspectPdfForm(createCorruptPdfBytes())).rejects.toThrow();

      const emptyRes = await compileFormPdf(
        new Uint8Array(0),
        [],
        DEFAULT_COMPILE_OPTIONS
      );
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.errorCode).toBe('INVALID_INPUT');

      const badRes = await compileFormPdf(
        createCorruptPdfBytes(),
        [],
        DEFAULT_COMPILE_OPTIONS
      );
      expect(badRes.success).toBe(false);
      expect(badRes.errorCode).toBe('INVALID_PDF');
    });
  });
});
