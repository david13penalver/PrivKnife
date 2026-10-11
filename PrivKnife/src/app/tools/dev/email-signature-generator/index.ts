import { ToolDefinition } from '../../../core/models/tool.model';

export const emailSignatureGeneratorTool: ToolDefinition = {
  id: 'email-signature-generator',
  name: 'HTML Email Signature Generator',
  category: 'dev',
  description:
    'Design responsive, multi-client compatible HTML email signatures for Gmail, Outlook, and Apple Mail with zero server tracking and instant rich-text copying.',
  keywords: [
    'free html email signature maker',
    'gmail signature generator',
    'outlook html signature builder',
    'no sign up email signature tool',
    'raw html email signature generator',
    'responsive email signature templates',
    'client side signature maker',
  ],
  icon: 'mail',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./email-signature-generator.component').then(
      (m) => m.EmailSignatureGeneratorComponent
    ),
};

export { EmailSignatureGeneratorComponent } from './email-signature-generator.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
