import { ToolDefinition } from '../../../core/models/tool.model';

export const calendarLinkerTool: ToolDefinition = {
  id: 'calendar-linker',
  name: 'Universal Event & .ics Calendar Linker',
  category: 'dev',
  description:
    'Generate universal "Add to Calendar" links for Google, Outlook, Office 365, and Yahoo, plus standard RFC 5545 .ics files and email embed snippets.',
  keywords: [
    'add to calendar link generator',
    'free ics file generator online',
    'create add to calendar button for email',
    'google calendar url builder',
    'outlook invite link maker',
    'rfc 5545 ics maker offline',
    'client side event calendar linker',
  ],
  icon: 'calendar',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./calendar-linker.component').then(
      (m) => m.CalendarLinkerComponent
    ),
};

export { CalendarLinkerComponent } from './calendar-linker.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
