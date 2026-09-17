import configData from './config/calendar.json';
import localeData from './locales/en.json';

export interface DayConfig {
  day: number;
  hotspot: { x: number; y: number };
  unlockDate: string;
  contentType: 'lottie' | 'video' | 'static' | 'reflection';
  mediaPath: string;
  posterPath?: string;
  hasGoDeeper: boolean;
  stateUpdate: string;
}

export interface CalendarConfig {
  startDate: string;
  days: DayConfig[];
}

export interface LocaleData {
  locale: string;
  ui: {
    lockedMessage: string;
    goDeeperBtn: string;
    closeBtn: string;
    backToPiazzaBtn: string;
  };
  content: Record<string, {
    title: string;
    text: string;
    goDeeperUrl: string;
    deeperContent?: {
      title: string;
      scripture: string;
      devotional: string;
    };
  }>;
}

export const config = configData as CalendarConfig;
export const locale = localeData as LocaleData;

const STORAGE_KEY = 'advent_calendar_state';

// State management
export class CalendarState {
  private openedDays: Set<number>;

  constructor() {
    this.openedDays = new Set<number>();
    this.loadState();
  }

  private loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.openedDays = new Set(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load calendar state from localStorage', e);
    }
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.openedDays)));
    } catch (e) {
      console.warn('Could not save calendar state to localStorage', e);
    }
  }

  public markOpened(day: number) {
    this.openedDays.add(day);
    this.saveState();
  }

  public isOpened(day: number): boolean {
    return this.openedDays.has(day);
  }

  // Purely client-side logic based on user's system clock.
  public isUnlocked(dayConfig: DayConfig): boolean {
    const today = new Date();
    const unlockDate = new Date(dayConfig.unlockDate + 'T00:00:00');
    
    // Allow URL override for testing (e.g. ?demo=true unlocks first 3 days)
    const isDemo = new URLSearchParams(window.location.search).has('demo');
    if (isDemo) {
      return dayConfig.day <= 3;
    }
    
    return today >= unlockDate;
  }
}

export const state = new CalendarState();
