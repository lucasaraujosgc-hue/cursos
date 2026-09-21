/**
 * Anonymous access tracking.
 *
 * A random id is kept in localStorage so the panel can tell "10 visits" from
 * "10 people". It carries no personal data and is never tied to a name or a
 * phone — someone who reads a whole course and never registers is counted just
 * the same.
 *
 * Every call fails silently: tracking must never break the page for a reader.
 */

const VISITOR_KEY = 'virgula-visitor-id';

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Private mode or blocked storage: still count the visit, as a one-off id.
    return randomId();
  }
}

type TrackPayload = {
  type: 'course_view' | 'module_view' | 'course_complete';
  courseSlug: string;
  moduleIndex?: number | null;
  moduleTitle?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referrer?: string;
};

export function track(payload: TrackPayload) {
  try {
    const body = JSON.stringify({ ...payload, visitorId: getVisitorId() });

    // sendBeacon survives the page being closed right after the click, which is
    // exactly when the last module view would otherwise be lost.
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
      return;
    }

    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* tracking is best-effort */
  }
}
