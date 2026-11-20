export type WorkshopValue = number | string | boolean | null;
export type WorkshopValues = Record<string, WorkshopValue>;
export type WorkshopFormat = 'stl' | '3mf';
export type WorkshopMetrics = Record<string, number | boolean>;

export interface WorkshopRequest<T = WorkshopValues> {
  type: WorkshopFormat | 'preview';
  options: T;
}

export interface PreviewPart {
  positions: ArrayBuffer;
  indices: ArrayBuffer | null;
  material: number;
}

export type WorkshopResponse =
  | { type: 'progress'; percent: number }
  | { type: 'error'; key: string }
  | { type: 'preview'; parts: PreviewPart[]; metrics: WorkshopMetrics }
  | { type: 'download'; buffer: ArrayBuffer; metrics: WorkshopMetrics };

export type WorkshopPost = (response: WorkshopResponse, transfer?: Transferable[]) => void;
