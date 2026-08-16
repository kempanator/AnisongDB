import { computed, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, timer } from 'rxjs';

export interface RankedStatus {
  active: boolean;
  region: string | null;
  remainingSeconds: number;
}

export const RANKED_REGIONS = [
  {
    region: 'Central',
    timeZone: 'Europe/Copenhagen',
    timeZoneLabel: 'CET/CEST',
  },
  {
    region: 'Western',
    timeZone: 'America/Chicago',
    timeZoneLabel: 'CDT/CST',
  },
  {
    region: 'Eastern',
    timeZone: 'Asia/Tokyo',
    timeZoneLabel: 'JST',
  },
] as const;

const RANKED_START_SECONDS = (20 * 60 + 30) * 60;
const RANKED_END_SECONDS = (21 * 60 + 23) * 60;

export const RANKED_SCHEDULE_LABEL = [
  `${formatClockTime(RANKED_START_SECONDS)}–${formatClockTime(RANKED_END_SECONDS)}`,
  `(${Math.floor((RANKED_END_SECONDS - RANKED_START_SECONDS) / 60)} minutes)`,
].join(' ');

@Injectable({ providedIn: 'root' })
export class RankedStatusService {
  private static readonly REGIONS: ReadonlyArray<{
    region: string;
    localSeconds: (date: Date) => number;
  }> = RANKED_REGIONS.map(({ timeZone, region }) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return {
      region,
      localSeconds(date: Date): number {
        const parts = formatter.formatToParts(date);
        const value = (type: string) =>
          Number(parts.find((part) => part.type === type)?.value ?? 0);
        return value('hour') * 3600 + value('minute') * 60 + value('second');
      },
    };
  });

  readonly status = toSignal(
    timer(0, 1000).pipe(
      map(() => this.getStatus()),
      distinctUntilChanged((previous, current) =>
        previous.active === current.active
        && previous.region === current.region
        && previous.remainingSeconds === current.remainingSeconds
      ),
    ),
    { initialValue: this.getStatus() },
  );
  readonly active = computed(() => this.status().active);

  getStatus(date: Date = new Date()): RankedStatus {
    for (const { region, localSeconds } of RankedStatusService.REGIONS) {
      const localSecond = localSeconds(date);
      if (
        localSecond >= RANKED_START_SECONDS
        && localSecond < RANKED_END_SECONDS
      ) {
        return {
          active: true,
          region,
          remainingSeconds: RANKED_END_SECONDS - localSecond,
        };
      }
    }

    return { active: false, region: null, remainingSeconds: 0 };
  }

  formatRemaining(status: RankedStatus): string {
    if (!status.active) return '';
    const minutes = Math.floor(status.remainingSeconds / 60);
    const seconds = status.remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

function formatClockTime(seconds: number): string {
  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor((seconds % 3600) / 60);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}
