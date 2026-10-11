import { ToolDefinition } from '../../../core/models/tool.model';

export const screenshotMockupTool: ToolDefinition = {
  id: 'screenshot-mockup',
  name: 'App Screenshot Mockup Studio',
  category: 'media',
  description:
    'Render mobile and web app screenshots onto customizable 3D device frames with realistic perspective angles, drop shadows, glass reflections, and gradient backgrounds. 100% in-browser.',
  keywords: [
    'device mockup generator free',
    '3d app screenshot mockup',
    'iphone mockup generator no upload',
    'free store screenshot maker',
    'macbook mockup generator',
    'browser mockup frame generator',
    'app store screenshot generator',
    'client side screenshot mockup',
  ],
  icon: 'layout',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./screenshot-mockup.component').then(
      (m) => m.ScreenshotMockupComponent
    ),
};

export { ScreenshotMockupComponent } from './screenshot-mockup.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
