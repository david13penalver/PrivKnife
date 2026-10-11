import { CalendarEvent, CalendarUrls } from './types';

/**
 * Formats a date string or Date object into compact UTC format (YYYYMMDDTHHmmssZ) or all-day (YYYYMMDD).
 */
export function formatUtcDateTime(
  dateInput: string | Date,
  isAllDay = false
): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  const year = d.getUTCFullYear();
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');

  if (isAllDay) {
    return `${year}${month}${day}`;
  }

  const hours = d.getUTCHours().toString().padStart(2, '0');
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const seconds = d.getUTCSeconds().toString().padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escapes characters for RFC 5545 compliance (newlines, commas, semicolons).
 */
export function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generates an RFC 5545 compliant .ics VCALENDAR / VEVENT data string.
 */
export function generateIcsFile(event: CalendarEvent): string {
  const nowUtc = formatUtcDateTime(new Date());
  const uid = `privknife-${Math.random().toString(36).substring(2, 10)}-${Date.now()}@privknife.dev`;

  const dtStart = event.isAllDay
    ? `DTSTART;VALUE=DATE:${formatUtcDateTime(event.startDate, true)}`
    : `DTSTART:${formatUtcDateTime(event.startDate)}`;

  const dtEnd = event.isAllDay
    ? `DTEND;VALUE=DATE:${formatUtcDateTime(event.endDate, true)}`
    : `DTEND:${formatUtcDateTime(event.endDate)}`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PrivKnife//Universal Event Calendar Linker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    dtStart,
    dtEnd,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  if (event.recurrence && event.recurrence !== 'none') {
    let rrule = `RRULE:FREQ=${event.recurrence}`;
    if (event.recurrenceCount && event.recurrenceCount > 0) {
      rrule += `;COUNT=${event.recurrenceCount}`;
    }
    lines.push(rrule);
  }

  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}

/**
 * Generates direct web URLs for Google, Outlook, Office 365, and Yahoo calendars.
 */
export function generateCalendarUrls(event: CalendarEvent): CalendarUrls {
  const startUtc = formatUtcDateTime(event.startDate, event.isAllDay);
  const endUtc = formatUtcDateTime(event.endDate, event.isAllDay);

  const startIso = new Date(event.startDate).toISOString();
  const endIso = new Date(event.endDate).toISOString();

  // 1. Google Calendar Web
  let googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    event.title
  )}&dates=${startUtc}/${endUtc}`;

  if (event.description) {
    googleUrl += `&details=${encodeURIComponent(event.description)}`;
  }
  if (event.location) {
    googleUrl += `&location=${encodeURIComponent(event.location)}`;
  }
  if (event.recurrence && event.recurrence !== 'none') {
    let rrule = `RRULE:FREQ=${event.recurrence}`;
    if (event.recurrenceCount) rrule += `;COUNT=${event.recurrenceCount}`;
    googleUrl += `&recur=${encodeURIComponent(rrule)}`;
  }

  // 2. Outlook Live (Personal)
  let outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(
    event.title
  )}&startdt=${encodeURIComponent(startIso)}&enddt=${encodeURIComponent(endIso)}`;

  if (event.description) {
    outlookUrl += `&body=${encodeURIComponent(event.description)}`;
  }
  if (event.location) {
    outlookUrl += `&location=${encodeURIComponent(event.location)}`;
  }

  // 3. Office 365 (Business / School)
  let office365Url = `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(
    event.title
  )}&startdt=${encodeURIComponent(startIso)}&enddt=${encodeURIComponent(endIso)}`;

  if (event.description) {
    office365Url += `&body=${encodeURIComponent(event.description)}`;
  }
  if (event.location) {
    office365Url += `&location=${encodeURIComponent(event.location)}`;
  }

  // 4. Yahoo Calendar
  let yahooUrl = `https://calendar.yahoo.com/?v=60&title=${encodeURIComponent(
    event.title
  )}&st=${startUtc}&et=${endUtc}`;

  if (event.description) {
    yahooUrl += `&desc=${encodeURIComponent(event.description)}`;
  }
  if (event.location) {
    yahooUrl += `&in_loc=${encodeURIComponent(event.location)}`;
  }

  // 5. Download Filename
  const cleanSlug =
    event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'event';
  const icsDownloadFilename = `${cleanSlug}.ics`;

  return {
    google: googleUrl,
    outlook: outlookUrl,
    office365: office365Url,
    yahoo: yahooUrl,
    icsDownloadFilename,
  };
}

/**
 * Builds cross-client HTML table buttons for email marketing templates.
 */
export function generateHtmlEmbed(
  event: CalendarEvent,
  urls: CalendarUrls
): string {
  return `<!-- Add to Calendar Email Buttons -->
<table cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <tr>
    <td style="font-size: 14px; font-weight: bold; color: #1e293b; padding-bottom: 8px;">
      📅 Add "${event.title}" to Calendar:
    </td>
  </tr>
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right: 8px; padding-bottom: 8px;">
            <a href="${urls.google}" target="_blank" style="background-color: #4285f4; color: #ffffff; padding: 8px 14px; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px; display: inline-block;">
              Google Calendar
            </a>
          </td>
          <td style="padding-right: 8px; padding-bottom: 8px;">
            <a href="${urls.outlook}" target="_blank" style="background-color: #0078d4; color: #ffffff; padding: 8px 14px; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px; display: inline-block;">
              Outlook Web
            </a>
          </td>
          <td style="padding-right: 8px; padding-bottom: 8px;">
            <a href="${urls.office365}" target="_blank" style="background-color: #d83b01; color: #ffffff; padding: 8px 14px; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px; display: inline-block;">
              Office 365
            </a>
          </td>
          <td style="padding-bottom: 8px;">
            <a href="${urls.yahoo}" target="_blank" style="background-color: #6001d2; color: #ffffff; padding: 8px 14px; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px; display: inline-block;">
              Yahoo Calendar
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Builds clean Markdown links for newsletters, documentation, and GitHub readmes.
 */
export function generateMarkdownEmbed(
  event: CalendarEvent,
  urls: CalendarUrls
): string {
  return `### 📅 Add "${event.title}" to your calendar:
- [Add to Google Calendar](${urls.google})
- [Add to Outlook](${urls.outlook})
- [Add to Office 365](${urls.office365})
- [Add to Yahoo Calendar](${urls.yahoo})`;
}

/**
 * Creates an in-browser Blob for the generated .ics file.
 */
export function exportIcsBlob(icsContent: string): Blob {
  return new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
}
