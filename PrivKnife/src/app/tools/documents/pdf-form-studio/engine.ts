import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
} from 'pdf-lib';
import {
  FormFontFamily,
  FormSnapshotParseResult,
  PdfFieldKind,
  PdfFormCompileOptions,
  PdfFormFieldModel,
  PdfFormInspection,
  PdfFormStudioDeps,
  PdfFormStudioResult,
  PdfWidgetPlacement,
} from './types';

const WINANSI_EXTRAS = new Set<number>([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function clampPercent(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Number(Math.min(100, Math.max(0, val)).toFixed(3));
}

export function pdfWidgetRectToPercent(
  rect: { x: number; y: number; width: number; height: number },
  cropBox: { x: number; y: number; width: number; height: number }
): { xPct: number; yPct: number; wPct: number; hPct: number } {
  const bw = Math.max(1, cropBox.width);
  const bh = Math.max(1, cropBox.height);

  const relX = rect.x - cropBox.x;
  const topFromTop = cropBox.y + cropBox.height - (rect.y + rect.height);

  return {
    xPct: clampPercent((relX / bw) * 100),
    yPct: clampPercent((topFromTop / bh) * 100),
    wPct: clampPercent((rect.width / bw) * 100),
    hPct: clampPercent((rect.height / bh) * 100),
  };
}

export function ensureUniqueFieldName(
  desired: string,
  usedNames: Set<string>
): string {
  const base = String(desired ?? '').trim() || 'field';
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }

  let idx = 2;
  while (usedNames.has(`${base}_${idx}`)) {
    idx++;
  }
  const unique = `${base}_${idx}`;
  usedNames.add(unique);
  return unique;
}

export function sanitizeTextForWinAnsi(input: string): {
  text: string;
  hadUnsupportedChars: boolean;
} {
  const str = String(input ?? '');
  let out = '';
  let hadUnsupportedChars = false;

  for (const ch of str) {
    const code = ch.codePointAt(0)!;
    const isAsciiPrintable = code >= 0x20 && code <= 0x7e;
    const isWhitespaceControl = code === 0x09 || code === 0x0a || code === 0x0d;
    const isLatin1 = code >= 0xa0 && code <= 0xff;
    if (
      isAsciiPrintable ||
      isWhitespaceControl ||
      isLatin1 ||
      WINANSI_EXTRAS.has(code)
    ) {
      out += ch;
    } else {
      out += '?';
      hadUnsupportedChars = true;
    }
  }

  return { text: out, hadUnsupportedChars };
}

export function serializeFormSnapshot(fields: PdfFormFieldModel[]): string {
  const obj: Record<string, string | boolean> = {};
  for (const field of fields) {
    if (!field?.name || FORBIDDEN_KEYS.has(field.name)) continue;
    obj[field.name] = field.value;
  }
  return JSON.stringify(obj, null, 2);
}

export function parseFormSnapshot(jsonText: string): FormSnapshotParseResult {
  try {
    const parsed: unknown = JSON.parse(String(jsonText ?? ''));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        valid: false,
        values: {},
        error: 'Snapshot must be a JSON object mapping field names to values.',
      };
    }

    const values: Record<string, string | boolean> = {};
    for (const key of Object.keys(parsed as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      const val = (parsed as Record<string, unknown>)[key];
      if (typeof val === 'string' || typeof val === 'boolean') {
        values[key] = val;
      }
    }
    return { valid: true, values };
  } catch (err: unknown) {
    return {
      valid: false,
      values: {},
      error: err instanceof Error ? err.message : 'Invalid JSON snapshot.',
    };
  }
}

export function buildFormOutputFileName(
  originalName: string,
  flattened: boolean
): string {
  const sanitized = String(originalName ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split(/[/\\]/)
    .pop()
    ?.trim();

  const suffix = flattened ? 'flattened' : 'filled';
  if (!sanitized) return `document-${suffix}.pdf`;
  const stem = sanitized.replace(/\.pdf$/i, '').trim() || 'document';
  return `${stem}-${suffix}.pdf`;
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.byteLength - 5, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

function resolveStandardFont(family: FormFontFamily): StandardFonts {
  if (family === 'times') return StandardFonts.TimesRoman;
  if (family === 'courier') return StandardFonts.Courier;
  return StandardFonts.Helvetica;
}

function resolveWidgetPageIndex(
  widget: any,
  pdfDoc: PDFDocument,
  pageRefToIndex: Map<string, number>
): number {
  try {
    const pRef = typeof widget.P === 'function' ? widget.P() : undefined;
    if (pRef) {
      const idx = pageRefToIndex.get(pRef.toString());
      if (idx !== undefined) return idx;
    }
  } catch {
    // Fallback to annot scan below
  }

  const pages = pdfDoc.getPages();
  for (let idx = 0; idx < pages.length; idx++) {
    const annots = pages[idx].node.Annots();
    if (!annots) continue;
    for (let a = 0; a < annots.size(); a++) {
      const looked = pdfDoc.context.lookup(annots.get(a));
      if (looked === widget.dict) return idx;
    }
  }
  return 0;
}

export async function inspectPdfForm(
  pdfBytes: Uint8Array
): Promise<PdfFormInspection> {
  if (!pdfBytes || pdfBytes.byteLength < 8 || !hasPdfSignature(pdfBytes)) {
    throw new Error('Invalid PDF buffer.');
  }

  const normalized = new Uint8Array(pdfBytes);
  const rawLatin1 = new TextDecoder('latin1').decode(normalized);
  let hasXfa = /\/XFA[\s\[<]/.test(rawLatin1);

  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const joined = args.map(String).join(' ');
    if (/\bXFA\b/i.test(joined)) {
      hasXfa = true;
      return;
    }
    origWarn.apply(console, args);
  };

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(normalized, { updateMetadata: false });
    const pageCount = pdfDoc.getPageCount();
    if (pageCount <= 0) {
      throw new Error('PDF contains zero pages.');
    }

    const pages = pdfDoc.getPages();
    const pageSizes = pages.map((p) => p.getSize());
    const pageBoxes = pages.map((p) => p.getCropBox());
    const pageRefToIndex = new Map<string, number>();
    pages.forEach((p, idx) => pageRefToIndex.set(p.ref.toString(), idx));

    const inspectedFields: PdfFormFieldModel[] = [];

    try {
      const acroDict = pdfDoc.catalog.getAcroForm()?.dict;
      if (acroDict?.has(PDFName.of('XFA'))) {
        hasXfa = true;
      }
      const form = pdfDoc.getForm();
      if (form.acroForm?.dict?.has(PDFName.of('XFA'))) {
        hasXfa = true;
      }

      const fields = form.getFields();
      for (let fIdx = 0; fIdx < fields.length; fIdx++) {
        const field = fields[fIdx];
        const name = field.getName();
        const readOnly = field.isReadOnly();
        const required = field.isRequired();

        let kind: PdfFieldKind = 'text';
        let value: string | boolean = '';
        let options: string[] | undefined;
        let maxLength: number | undefined;

        if (field instanceof PDFTextField) {
          kind = field.isMultiline() ? 'textarea' : 'text';
          value = field.getText() ?? '';
          maxLength = field.getMaxLength();
        } else if (field instanceof PDFCheckBox) {
          kind = 'checkbox';
          value = field.isChecked();
        } else if (field instanceof PDFRadioGroup) {
          kind = 'radio';
          options = field.getOptions();
          value = field.getSelected() ?? '';
        } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
          kind = 'dropdown';
          options = field.getOptions();
          value = field.getSelected()[0] ?? '';
        }

        const widgets = field.acroField.getWidgets();
        const placements: PdfWidgetPlacement[] = widgets.map((w) => {
          const rect = w.getRectangle();
          const pageIndex = resolveWidgetPageIndex(w, pdfDoc, pageRefToIndex);
          const box = pageBoxes[pageIndex] ?? {
            x: 0,
            y: 0,
            width: 595,
            height: 842,
          };
          const pct = pdfWidgetRectToPercent(rect, box);
          return {
            pageIndex,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            ...pct,
          };
        });

        inspectedFields.push({
          id: `existing-${fIdx}-${name}`,
          name,
          kind,
          isNew: false,
          readOnly,
          required,
          value,
          options,
          maxLength,
          placements,
        });
      }
    } catch {
      // Non-form PDF without AcroForm dictionary
    }

    return {
      pageCount,
      pageSizes,
      hasXfa,
      fields: inspectedFields,
    };
  } finally {
    console.warn = origWarn;
  }
}

export async function compileFormPdf(
  pdfBytes: Uint8Array,
  fields: PdfFormFieldModel[],
  options: PdfFormCompileOptions,
  deps: PdfFormStudioDeps = {}
): Promise<PdfFormStudioResult> {
  const flatten = Boolean(options?.flatten);
  const outName = buildFormOutputFileName(
    options?.outputFileName ?? 'document.pdf',
    flatten
  );

  if (!pdfBytes || pdfBytes.byteLength < 8) {
    return {
      success: false,
      fileName: outName,
      fileSize: 0,
      fieldsPopulated: 0,
      fieldsCreated: 0,
      flattened: false,
      errorCode: 'INVALID_INPUT',
      error: 'Input PDF buffer is empty or invalid.',
    };
  }

  if (!hasPdfSignature(pdfBytes)) {
    return {
      success: false,
      fileName: outName,
      fileSize: 0,
      fieldsPopulated: 0,
      fieldsCreated: 0,
      flattened: false,
      errorCode: 'INVALID_PDF',
      error: 'Selected file does not have a valid %PDF- header.',
    };
  }

  deps.onProgress?.(10, 'Loading AcroForm PDF');

  try {
    const normalized = new Uint8Array(pdfBytes);
    const pdfDoc = await PDFDocument.load(normalized, { updateMetadata: false });
    const pageCount = pdfDoc.getPageCount();
    if (pageCount <= 0) {
      return {
        success: false,
        fileName: outName,
        fileSize: 0,
        fieldsPopulated: 0,
        fieldsCreated: 0,
        flattened: false,
        errorCode: 'INVALID_PDF',
        error: 'PDF contains zero pages.',
      };
    }

    const pages = pdfDoc.getPages();
    const form = pdfDoc.getForm();
    const embeddedFont = await pdfDoc.embedFont(
      resolveStandardFont(options?.fontFamily ?? 'helvetica')
    );

    const existingMap = new Map(
      form.getFields().map((f) => [f.getName(), f])
    );
    const usedNames = new Set<string>(existingMap.keys());
    const warnings: string[] = [];
    let warnedUnicode = false;
    let fieldsPopulated = 0;
    let fieldsCreated = 0;

    deps.onProgress?.(35, 'Applying form field values');

    // Update existing fields
    for (const model of fields ?? []) {
      if (!model || model.isNew) continue;
      const pdfField = existingMap.get(model.name);
      if (!pdfField || pdfField.isReadOnly()) continue;

      if (pdfField instanceof PDFTextField) {
        const sanitized = sanitizeTextForWinAnsi(String(model.value ?? ''));
        if (sanitized.hadUnsupportedChars && !warnedUnicode) {
          warnings.push(
            'Non-WinAnsi Unicode characters were normalized to "?" for standard PDF fonts.'
          );
          warnedUnicode = true;
        }
        const maxLen = pdfField.getMaxLength();
        const clipped =
          maxLen && maxLen > 0
            ? sanitized.text.slice(0, maxLen)
            : sanitized.text;
        pdfField.setText(clipped);
        fieldsPopulated++;
      } else if (pdfField instanceof PDFCheckBox) {
        if (model.value === true || model.value === 'true') {
          pdfField.check();
        } else {
          pdfField.uncheck();
        }
        fieldsPopulated++;
      } else if (
        pdfField instanceof PDFDropdown ||
        pdfField instanceof PDFOptionList
      ) {
        const val = String(model.value ?? '');
        if (!val) {
          pdfField.clear();
        } else {
          if (!pdfField.getOptions().includes(val)) {
            pdfField.addOptions(val);
          }
          pdfField.select(val);
        }
        fieldsPopulated++;
      } else if (pdfField instanceof PDFRadioGroup) {
        const val = String(model.value ?? '');
        if (!val) {
          pdfField.clear();
        } else if (pdfField.getOptions().includes(val)) {
          pdfField.select(val);
        }
        fieldsPopulated++;
      }
    }

    deps.onProgress?.(60, 'Creating custom AcroForm fields');

    // Add newly created fields
    for (const model of fields ?? []) {
      if (!model || !model.isNew || !model.placements?.length) continue;
      const validPlacements = model.placements.filter(
        (p) => p.pageIndex >= 0 && p.pageIndex < pages.length
      );
      if (validPlacements.length === 0) continue;

      const uniqueName = ensureUniqueFieldName(model.name, usedNames);

      if (model.kind === 'text' || model.kind === 'textarea') {
        const tf = form.createTextField(uniqueName);
        if (model.kind === 'textarea') tf.enableMultiline();
        if (model.maxLength && model.maxLength > 0) {
          tf.setMaxLength(model.maxLength);
        }
        for (const p of validPlacements) {
          tf.addToPage(pages[p.pageIndex], {
            x: p.x,
            y: p.y,
            width: Math.max(16, p.width),
            height: Math.max(14, p.height),
            font: embeddedFont,
            borderWidth: 1,
          });
        }
        if (model.fontSizePt && model.fontSizePt > 0) {
          tf.setFontSize(model.fontSizePt);
        }
        const sanitized = sanitizeTextForWinAnsi(String(model.value ?? ''));
        if (sanitized.hadUnsupportedChars && !warnedUnicode) {
          warnings.push(
            'Non-WinAnsi Unicode characters were normalized to "?" for standard PDF fonts.'
          );
          warnedUnicode = true;
        }
        const maxLen = tf.getMaxLength();
        const clipped =
          maxLen && maxLen > 0
            ? sanitized.text.slice(0, maxLen)
            : sanitized.text;
        if (clipped) tf.setText(clipped);
        fieldsCreated++;
      } else if (model.kind === 'checkbox') {
        const cb = form.createCheckBox(uniqueName);
        for (const p of validPlacements) {
          cb.addToPage(pages[p.pageIndex], {
            x: p.x,
            y: p.y,
            width: Math.max(12, p.width),
            height: Math.max(12, p.height),
            borderWidth: 1,
          });
        }
        if (model.value === true || model.value === 'true') cb.check();
        fieldsCreated++;
      } else if (model.kind === 'dropdown') {
        const dd = form.createDropdown(uniqueName);
        const opts =
          model.options && model.options.length > 0
            ? model.options
            : ['Option 1', 'Option 2'];
        dd.addOptions(opts);
        for (const p of validPlacements) {
          dd.addToPage(pages[p.pageIndex], {
            x: p.x,
            y: p.y,
            width: Math.max(24, p.width),
            height: Math.max(18, p.height),
            font: embeddedFont,
            borderWidth: 1,
          });
        }
        const val = String(model.value ?? '');
        if (val) {
          if (!dd.getOptions().includes(val)) dd.addOptions(val);
          dd.select(val);
        }
        fieldsCreated++;
      } else if (model.kind === 'radio') {
        const rg = form.createRadioGroup(uniqueName);
        const opts =
          model.options && model.options.length > 0
            ? model.options
            : validPlacements.map((_, idx) => `Option ${idx + 1}`);
        validPlacements.forEach((p, idx) => {
          const optName = opts[idx] ?? `Option ${idx + 1}`;
          rg.addOptionToPage(optName, pages[p.pageIndex], {
            x: p.x,
            y: p.y,
            width: Math.max(12, p.width),
            height: Math.max(12, p.height),
            borderWidth: 1,
          });
        });
        const val = String(model.value ?? '');
        if (val && rg.getOptions().includes(val)) {
          rg.select(val);
        }
        fieldsCreated++;
      }
    }

    deps.onProgress?.(82, flatten ? 'Flattening form fields' : 'Updating form appearances');

    if (form.getFields().length > 0) {
      try {
        form.updateFieldAppearances(embeddedFont);
      } catch {
        // Fallback if third-party field dictionaries omit expected appearance keys
      }
      if (flatten) {
        form.flatten();
      }
    }

    const outBytes = new Uint8Array(await pdfDoc.save());
    const blob = new Blob([outBytes], { type: 'application/pdf' });
    deps.onProgress?.(100, 'Complete');

    return {
      success: true,
      blob,
      bytes: outBytes,
      fileName: outName,
      fileSize: outBytes.byteLength,
      fieldsPopulated,
      fieldsCreated,
      flattened: flatten,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unable to compile PDF form.';
    const isEncrypted = /encrypt/i.test(msg);
    return {
      success: false,
      fileName: outName,
      fileSize: 0,
      fieldsPopulated: 0,
      fieldsCreated: 0,
      flattened: false,
      errorCode: isEncrypted ? 'ENCRYPTED_PDF' : 'INVALID_PDF',
      error: isEncrypted
        ? 'PDF is encrypted. Unlock it first before filling or editing form fields.'
        : msg,
    };
  }
}
