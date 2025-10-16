import { Injectable, HttpException } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class CalendarService {
  async fetchCalendarEvents(user: { provider_token: string | undefined }) {
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
}
