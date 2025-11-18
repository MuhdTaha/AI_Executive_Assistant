import { Injectable, HttpException } from '@nestjs/common';
import fetch from 'node-fetch';

type CreateCalendarEventInput = {
  start: string;        // ISO-8601
  end: string;          // ISO-8601
  summary: string;
  description?: string;
  extendedPrivate?: Record<string, string>;
};

type CalendarUser = { provider_token?: string };

@Injectable()
export class CalendarService {
  async fetchCalendarEvents(user: CalendarUser) {
    const token = user?.provider_token;
    if (!token) {
      throw new HttpException('Missing Google access token', 401);
    }

    const url =
      'https://www.googleapis.com/calendar/v3/calendars/primary/events' +
      '?maxResults=10&orderBy=startTime&singleEvents=true&timeMin=' +
      new Date().toISOString();

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new HttpException(
        errData.error?.message || 'Failed to fetch events',
        res.status,
      );
    }

    const data = await res.json();
    return data.items || [];
  }

  async createEvent(user: CalendarUser, input: CreateCalendarEventInput) {
    // DEV fallback — useful before Google OAuth is wired
    if (process.env.DEV_FAKE_CALENDAR === '1') {
      return { id: `DEV-${Math.random().toString(36).slice(2)}`, dev: true };
    }

    const token = user?.provider_token;
    if (!token) {
      throw new HttpException('Missing Google access token', 401);
    }

    const body = {
      summary: input.summary,
      description: input.description ?? '',
      start: { dateTime: input.start },
      end:   { dateTime: input.end },
      extendedProperties: input.extendedPrivate
        ? { private: input.extendedPrivate }
        : undefined,
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 5 }],
      },
    };

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new HttpException(err || 'Failed to create event', res.status);
    }

    return await res.json(); // includes { id: '...' }
  }
}


