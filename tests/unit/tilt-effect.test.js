import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { attachTiltEffect } from '../../src/js/utils/sanitize.js';

function fakeCard() {
  const handlers = {};
  return {
    style: { transform: 'preset', setProperty: () => {} },
    rectCalls: 0,
    getBoundingClientRect() { this.rectCalls += 1; return { left: 0, top: 0, width: 200, height: 100 }; },
    addEventListener(e, h) { handlers[e] = h; },
    removeEventListener(e) { delete handlers[e]; },
    handlers
  };
}

describe('attachTiltEffect', () => {
  beforeEach(() => {
    globalThis.requestAnimationFrame = (fn) => { fn(); return 7; };
    globalThis.cancelAnimationFrame = () => {};
    globalThis.document = { documentElement: { classList: { contains: () => false } } };
    delete globalThis.window;
  });

  afterEach(() => {
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    delete globalThis.document;
  });

  it('tilts on mousemove and clears on leave', () => {
    const card = fakeCard();
    attachTiltEffect(card, {});
    card.handlers.mousemove({ clientX: 150, clientY: 25 });
    expect(card.style.transform).toContain('rotateX');
    expect(card.style.transform).toContain('rotateY');
    card.handlers.mouseleave();
    expect(card.style.transform).toBe('');
  });

  it('settles when the pointer stops (no repeated work)', () => {
    const card = fakeCard();
    attachTiltEffect(card, {});
    card.handlers.mousemove({ clientX: 150, clientY: 25 });
    const calls = card.rectCalls;
    card.handlers.mousemove({ clientX: 150, clientY: 25 });
    card.handlers.mousemove({ clientX: 150, clientY: 25 });
    expect(card.rectCalls).toBe(calls);
  });

  it('skips the effect under reduced-motion', () => {
    globalThis.document = { documentElement: { classList: { contains: () => true } } };
    const card = fakeCard();
    attachTiltEffect(card, {});
    card.handlers.mousemove({ clientX: 150, clientY: 25 });
    expect(card.style.transform).toBe('preset');
    expect(card.rectCalls).toBe(0);
  });
});
