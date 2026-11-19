import { ToolDefinition } from '../../../core/models/tool.model';

export const encoderDecoderWorkbenchTool: ToolDefinition = {
  id: 'encoder-decoder-workbench',
  name: 'Universal Encoder / Decoder Workbench',
  category: 'dev',
  description:
    'Encode and decode Base64/Files/Data URIs, URL query strings, HTML entities, Hex, Binary/Octal/Decimal, and ITU Morse with live CW audio locally.',
  keywords: [
    'base64 encoder',
    'url encoder',
    'html entities',
    'hex converter',
    'binary translator',
    'morse code audio',
    'data uri',
  ],
  icon: '🔁',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./encoder-decoder-workbench.component').then(
      (m) => m.EncoderDecoderWorkbenchComponent
    ),
};
