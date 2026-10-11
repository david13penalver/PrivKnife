export type RecurrenceFreq = 'none' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type EmbedSnippetType = 'links' | 'html' | 'markdown' | 'ics';

export interface CalendarEvent {
  title: string;
  startDate: string; // YYYY-MM-DDTHH:mm or YYYY-MM-DD
  endDate: string; // YYYY-MM-DDTHH:mm or YYYY-MM-DD
  isAllDay?: boolean;
  timezone?: string;
  description?: string;
  location?: string;
  recurrence?: RecurrenceFreq;
  recurrenceCount?: number;
}

export interface CalendarUrls {
  google: string;
  outlook: string;
  office365: string;
  yahoo: string;
  icsDownloadFilename: string;
}
