import { Type } from '@angular/core';

export type ToolCategory =
  | 'privacy'
  | 'documents'
  | 'media'
  | 'audio-video'
  | 'dev'
  | '3d';

export interface ToolDefinition {
  id: string;
  name: string;
  i18nKey?: string;
  category: ToolCategory;
  description: string;
  keywords: string[];
  icon: string;
  isFullyClientSide: true;
  loadComponent: () => Promise<Type<any>>;
}
