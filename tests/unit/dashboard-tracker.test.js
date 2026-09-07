import { describe, it, expect } from 'vitest';
import { Dashboard } from '../../src/js/modules/dashboard.js';
import { ApplicationTracker } from '../../src/js/modules/application-tracker.js';

describe('Dashboard.groupDuplicates', () => {
  it('groups same-name docs, ignores archived', () => {
    const docs = [
      { id: '1', name: 'My Resume', personalInfo: { email: 'a@x.com' } },
      { id: '2', name: 'my resume!', personalInfo: { email: 'a@x.com' } },
      { id: '3', name: 'My Resume', personalInfo: { email: 'b@x.com' } },
      { id: '4', name: 'Old CV', archived: true },
      { id: '5', name: 'Old CV', archived: true },
    ];
    const groups = Dashboard.groupDuplicates(docs);
    expect(groups.length).toBe(1);
    expect(groups[0].map((d) => d.id).sort()).toEqual(['1', '2']);
  });
  it('returns [] for distinct docs', () => {
    expect(Dashboard.groupDuplicates([
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ])).toEqual([]);
  });
});

describe('ApplicationTracker follow-up nudge', () => {
  const t = new ApplicationTracker(null, null);
  const ago = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  it('nudges stale applied applications only', () => {
    expect(t.followUpDays({ status: 'applied', appliedDate: ago(9) })).toBeGreaterThanOrEqual(7);
    expect(t.followUpBadge({ status: 'applied', appliedDate: ago(9) })).toContain('Follow up');
    expect(t.followUpBadge({ status: 'applied', appliedDate: ago(2) })).toBe('');
    expect(t.followUpBadge({ status: 'interview', appliedDate: ago(30) })).toBe('');
    expect(t.followUpBadge({ status: 'applied', appliedDate: 'not-a-date' })).toBe('');
  });
});
