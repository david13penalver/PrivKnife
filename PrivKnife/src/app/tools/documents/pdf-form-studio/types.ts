export type PdfFieldKind = 'text' | 'textarea' | 'checkbox' | 'radio' | 'dropdown';
export type FormStudioMode = 'fill' | 'create';
export type FormFontFamily = 'helvetica' | 'times' | 'courier';

export type PdfFormStudioErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_PDF'
  | 'ENCRYPTED_PDF'
  | 'INVALID_OPTIONS'
  | 'WORKER_ERROR';

export interface PdfWidgetPlacement {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xPct?: number;
  yPct?: number;
  wPct?: number;
  hPct?: number;
}

export interface PdfFormFieldModel {
  id: string;
  name: string;
  kind: PdfFieldKind;
  isNew: boolean;
  readOnly: boolean;
  required: boolean;
  value: string | boolean;
  options?: string[];
  fontSizePt?: number;
  maxLength?: number;
  placements: PdfWidgetPlacement[];
}

export interface PdfFormInspection {
  pageCount: number;
  pageSizes: Array<{ width: number; height: number }>;
  hasXfa: boolean;
  fields: PdfFormFieldModel[];
}

export interface PdfFormCompileOptions {
  flatten: boolean;
  fontFamily: FormFontFamily;
  outputFileName: string;
}

export interface PdfFormStudioResult {
  success: boolean;
  blob?: Blob;
  bytes?: Uint8Array;
  fileName: string;
  fileSize: number;
  fieldsPopulated: number;
  fieldsCreated: number;
  flattened: boolean;
  warnings?: string[];
  errorCode?: PdfFormStudioErrorCode;
  error?: string;
}

export interface FormSnapshotParseResult {
  valid: boolean;
  values: Record<string, string | boolean>;
  error?: string;
}

export interface PdfFormStudioDeps {
  onProgress?: (percent: number, stage: string) => void;
}

export type PdfFormWorkerRequest =
  | { type: 'inspect'; pdfBytes: Uint8Array }
  | {
      type: 'compile';
      pdfBytes: Uint8Array;
      fields: PdfFormFieldModel[];
      options: PdfFormCompileOptions;
    };

export type PdfFormWorkerResponse =
  | { type: 'progress'; percent: number; stage: string }
  | {
      type: 'inspect_done';
      inspection?: PdfFormInspection;
      errorCode?: PdfFormStudioErrorCode;
      error?: string;
    }
  | { type: 'done'; result: PdfFormStudioResult };
