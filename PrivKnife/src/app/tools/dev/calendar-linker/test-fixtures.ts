import { CalendarEvent } from './types';

export const DEFAULT_CALENDAR_EVENT: CalendarEvent = {
  title: 'Privacy-First Architecture Webinar',
  startDate: '2026-10-15T10:00',
  endDate: '2026-10-15T11:00',
  isAllDay: false,
  timezone: 'UTC',
  description:
    'Join us for a deep dive into client-side web application architectures and zero-telemetry design.\n\nMeeting link: https://meet.privknife.dev/room-42',
  location: 'https://meet.privknife.dev/room-42',
  recurrence: 'none',
};

export const SAMPLE_RECURRING_EVENT: CalendarEvent = {
  title: 'Weekly Engineering Sync',
  startDate: '2026-10-16T14:00',
  endDate: '2026-10-16T15:00',
  isAllDay: false,
  timezone: 'UTC',
  description: 'Sprint review and roadmap alignment.',
  location: 'Conference Room Alpha',
  recurrence: 'WEEKLY',
  recurrenceCount: 12,
};

export const SAMPLE_ALLDAY_EVENT: CalendarEvent = {
  title: 'Global Privacy Hackathon 2026',
  startDate: '2026-11-01',
  endDate: '2026-11-02',
  isAllDay: true,
  timezone: 'UTC',
  description: '48-hour decentralized hackathon.',
  location: 'Online',
  recurrence: 'none',
};
