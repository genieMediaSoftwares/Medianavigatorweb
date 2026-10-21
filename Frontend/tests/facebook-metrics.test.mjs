import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { facebookMetricLimitations, postMetricValue, POST_METRICS } from '../src/features/analysis/post-metrics.ts';
import { releaseNavigationFocus } from '../src/lib/navigation/release-focus.web.ts';
import { isMetaImage, PostImage } from '../src/features/analysis/PostImage.web.tsx';

const post = (overrides = {}) => ({
  id: 'fb_test-post', platform: 'facebook', platformContentId: 'test-post', contentType: 'video',
  contentTypeBasis: 'provider', title: '', caption: '', thumbnailUrl: '', publishedAt: '2026-10-01T00:00:00Z',
  views: 5400, reach: 4100, likes: 120, comments: 15, shares: 7, engagementRate: 2.63,
  watchTimeMinutes: 30, unavailableMetrics: ['saves'], ...overrides,
});

test('Meta CDN thumbnails use anonymous CORS requests and never send a referrer', () => {
  const html = renderToStaticMarkup(React.createElement(PostImage, { uri: 'https://scontent.example.fbcdn.net/photo.jpg', onError() {} }));
  assert.match(html, /crossorigin="anonymous"/i);
  assert.match(html, /referrerpolicy="no-referrer"/i);
  assert.match(html, /loading="lazy"/);
});

test('CDN detection accepts only HTTPS Meta image hosts', () => {
  assert.equal(isMetaImage('https://scontent.cdninstagram.com/image.jpg'), true);
  for (const uri of ['https://fbcdn.net.evil.example/image.jpg', 'https://example.com/fbcdn.net/image.jpg', 'http://scontent.fbcdn.net/image.jpg', 'invalid']) {
    assert.equal(isMetaImage(uri), false);
  }
  const html = renderToStaticMarkup(React.createElement(PostImage, { uri: 'https://example.com/image.jpg', onError() {} }));
  assert.doesNotMatch(html, /crossorigin=/i);
});

test('app keeps every measured Facebook value, including watch time', () => {
  const item = post();
  for (const key of POST_METRICS) assert.equal(postMetricValue(item, key), item[key]);
  assert.equal(facebookMetricLimitations(item), undefined);
});

test('measured zeros remain zeros, matching the website availability contract', () => {
  const item = post({ views: 0, likes: 0, comments: 0, shares: 0, reach: 0, engagementRate: 0, watchTimeMinutes: 0 });
  for (const key of POST_METRICS) assert.equal(postMetricValue(item, key), 0);
});

test('missing provider values stay unavailable even when the server includes default zeros', () => {
  const item = post({ views: 0, likes: 0, comments: 0, unavailableMetrics: ['views', 'likes'], missingMetrics: ['comments'] });
  for (const key of ['views', 'likes', 'comments']) assert.equal(postMetricValue(item, key), null);
  assert.equal(postMetricValue(item, 'shares'), 7);
  assert.match(facebookMetricLimitations(item), /views, reactions, comments/);
});

test('new sync replaces old missing flags and reveals the newly measured counts', () => {
  const old = post({ unavailableMetrics: ['views', 'likes', 'comments'] });
  const synced = post({ likes: 130, comments: 17 });
  assert.equal(postMetricValue(old, 'likes'), null);
  assert.equal(postMetricValue(synced, 'likes'), 130);
  assert.equal(postMetricValue(synced, 'comments'), 17);
  assert.equal(facebookMetricLimitations(synced), undefined);
});

test('absent or invalid numbers are never displayed as measured values', () => {
  assert.equal(postMetricValue(post({ watchTimeMinutes: undefined }), 'watchTimeMinutes'), null);
  assert.equal(postMetricValue(post({ views: Number.NaN }), 'views'), null);
  assert.equal(postMetricValue(post({ likes: -1 }), 'likes'), null);
  assert.equal(facebookMetricLimitations(post({ platform: 'instagram' })), undefined);
});

test('navigation focus release is safe outside a browser', () => {
  assert.doesNotThrow(() => releaseNavigationFocus());
});

test('outgoing focused button is blurred before the screen is hidden', () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalElement = Object.getOwnPropertyDescriptor(globalThis, 'HTMLElement');
  let blurred = false;
  class TestElement { blur() { blurred = true; } }
  try {
    Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: TestElement });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: new TestElement() } });
    releaseNavigationFocus();
    assert.equal(blurred, true);
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (originalElement) Object.defineProperty(globalThis, 'HTMLElement', originalElement);
    else Reflect.deleteProperty(globalThis, 'HTMLElement');
  }
});
