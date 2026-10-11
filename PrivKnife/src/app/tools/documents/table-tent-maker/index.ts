import { ToolDefinition } from '../../../core/models/tool.model';

export const tableTentMakerTool: ToolDefinition = {
  id: 'table-tent-maker',
  name: 'Foldable Table Tent & Counter Sign Maker',
  category: 'documents',
  description:
    'Create print-ready foldable triangular table signs with menus, QR codes, or Wi-Fi login badges with zero server uploads.',
  keywords: [
    'printable table tent generator',
    'free table tent template pdf',
    'qr code counter sign maker',
    'printable desk nameplate tent',
    'a4 table tent maker with fold lines',
    'restaurant menu table tent',
    'wedding table number tent card',
  ],
  icon: 'tent',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./table-tent-maker.component').then((m) => m.TableTentMakerComponent),
};

export { TableTentMakerComponent } from './table-tent-maker.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
