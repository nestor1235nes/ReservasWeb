export function generateICS({ summary, description, start, end, location = '', attendees = [] }) {
  const pad = (n) => n < 10 ? '0' + n : n;
  const formatDate = (date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return (
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      'Z'
    );
  };

  const dtStart = formatDate(start);
  const dtEnd = formatDate(end);

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ReservasWeb//ICalendar//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `LOCATION:${location}`,
    `UID:${Date.now()}@reservasweb`,
    `DTSTAMP:${dtStart}`,
  ];

  attendees.forEach(email => {
    ics.push(`ATTENDEE;CN=${email}:MAILTO:${email}`);
  });

  ics.push('END:VEVENT', 'END:VCALENDAR');
  return ics.join('\r\n');
}