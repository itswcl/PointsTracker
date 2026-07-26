import { describe, expect, it } from 'vitest';
import { manifest } from '../../manifest.config.js';

describe('extension permission boundary', () => {
  it('uses exact supported hosts and no credential-adjacent permissions', () => {
    expect(manifest.host_permissions).toEqual([
      'https://*.united.com/*',
      'https://*.cathaypacific.com/*',
      'https://wwws.airfrance.us/*',
      'https://www.virginatlantic.com/*',
      'https://www.alaskaair.com/*',
      'https://www.aa.com/*',
      'https://eservice.evaair.com/*',
      'https://www.britishairways.com/*',
      'https://stmt.cam.ana.co.jp/*',
      'https://cam.ana.co.jp/*',
      'https://www.delta.com/*',
      'https://www.hyatt.com/*',
      'https://www.hilton.com/*',
      'https://www.marriott.com/*',
      'https://www.ihg.com/*',
      'https://www.wyndhamhotels.com/*',
      'https://global.americanexpress.com/*',
      'https://ultimaterewardspoints.chase.com/*',
      'https://online.citi.com/*',
      'https://www.bilt.com/*',
      'https://api.github.com/*',
    ]);
    expect(manifest.host_permissions).not.toContain('<all_urls>');
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.permissions).not.toEqual(
      expect.arrayContaining(['cookies', 'history', 'webRequest']),
    );
    expect(manifest.icons).toEqual({
      16: 'assets/icons/icon-16.png',
      32: 'assets/icons/icon-32.png',
      48: 'assets/icons/icon-48.png',
      128: 'assets/icons/icon-128.png',
    });
    expect(manifest.action.default_icon).toEqual({
      16: 'assets/icons/icon-16.png',
      32: 'assets/icons/icon-32.png',
      48: 'assets/icons/icon-48.png',
    });
    expect(
      manifest.content_scripts.flatMap(({ matches }) => matches),
    ).not.toContain('https://api.github.com/*');
    expect(
      manifest.content_scripts.flatMap(({ matches }) => matches),
    ).toContain('https://www.ihg.com/*');
    expect(manifest.host_permissions).not.toContain('https://apis.ihg.com/*');
    expect(
      manifest.content_scripts.flatMap(({ matches }) => matches),
    ).toContain('https://www.wyndhamhotels.com/*');
    expect(
      manifest.content_scripts.flatMap(({ matches }) => matches),
    ).toContain('https://global.americanexpress.com/*');
    expect(
      manifest.content_scripts.flatMap(({ matches }) => matches),
    ).toContain('https://ultimaterewardspoints.chase.com/*');
    expect(
      manifest.content_scripts.flatMap(({ matches }) => matches),
    ).toContain('https://online.citi.com/*');
    expect(
      manifest.content_scripts.flatMap(({ matches }) => matches),
    ).toContain('https://www.bilt.com/*');
  });
});
