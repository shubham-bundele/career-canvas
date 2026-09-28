import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Guards the offline contract: every shell asset index.html needs must be in
// sw.js STATIC_ASSETS, and the localhost-only secret file must never be cached.
const root = process.cwd();
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function cachedAssets() {
  const m = sw.match(/STATIC_ASSETS\s*=\s*\[([\s\S]*?)\];/);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1].replace(/^\.\//, ''));
}

describe('offline cache contract', () => {
  it('uses a versioned cache name', () => {
    expect(sw).toMatch(/const CACHE_NAME = 'careercanvas-v\d+';/);
  });

  it('caches every CSS file linked from index.html', () => {
    const assets = cachedAssets();
    const linked = [...indexHtml.matchAll(/href="(src\/css\/[^"]+)"/g)].map((x) => x[1]);
    expect(linked.length).toBeGreaterThan(0);
    for (const css of linked) {
      expect(assets).toContain(css);
    }
  });

  it('caches every CSS file on disk (no stale additions missed)', () => {
    const assets = cachedAssets();
    const onDisk = fs.readdirSync(path.join(root, 'src/css')).filter((f) => f.endsWith('.css'));
    for (const f of onDisk) {
      expect(assets).toContain(`src/css/${f}`);
    }
  });

  it('caches shell-critical JS (core, auth, pages, app entry)', () => {
    const assets = cachedAssets();
    const required = [
      'src/js/app.js',
      'src/js/core/db.js',
      'src/js/core/router.js',
      'src/js/core/state.js',
      'src/js/core/events.js',
      'src/js/core/schema.js',
      'src/js/core/migration.js',
      'src/js/core/template-engine.js',
      'src/js/core/theme-engine.js',
      'src/js/auth/auth-config.js',
      'src/js/auth/auth-service.js',
      'src/js/auth/auth-state.js',
      'src/js/auth/auth-ui.js',
      'src/js/auth/cloud-store.js',
      'src/js/auth/user-store.js',
      'src/js/pages/static-pages.js'
    ];
    for (const js of required) {
      expect(assets).toContain(js);
    }
  });

  it('never caches the localhost-only secret file', () => {
    const assets = cachedAssets();
    expect(assets).not.toContain('src/js/auth/local-config.js');
    expect(sw).toContain('local-config.js');
  });

  it('caches the PWA manifest and icon linked from index.html', () => {
    const assets = cachedAssets();
    expect(indexHtml).toContain('rel="manifest"');
    expect(assets).toContain('manifest.json');
    expect(assets).toContain('icon.svg');
  });

  it('registers (not unregisters) the worker from index.html', () => {
    expect(indexHtml).toContain("navigator.serviceWorker.register('sw.js')");
    expect(indexHtml).not.toContain('reg.unregister()');
  });
});
