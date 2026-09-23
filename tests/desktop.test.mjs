import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeDesktop, isDesktop } from '../js/desktop.js';

test('website does not invoke native commands', async () => {
  assert.equal(isDesktop(), false);
  await initializeDesktop({ showToast() { assert.fail('desktop toast on website'); } });
});

test('desktop reports registered shortcuts and collisions without blocking startup', async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  try {
    globalThis.document = { documentElement: { dataset: {} } };
    for (const available of [true, false]) {
      const toasts = [];
      globalThis.window = { __TAURI__: { core: { invoke: async command => {
        assert.equal(command, 'desktop_status');
        return { shortcut: '⌘⇧K', shortcutAvailable: available };
      } } } };
      await initializeDesktop({ showToast: (...args) => toasts.push(args) });
      assert.equal(document.documentElement.dataset.platform, 'desktop');
      assert.equal(toasts[0][1], available ? 'teal' : 'amber');
      assert.match(toasts[0][0], available ? /brings you back/ : /unavailable/);
    }
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('native exports preserve bytes and distinguish cancellation from success', async () => {
  const { saveDownload } = await import('../js/desktop.js');
  const previousWindow = globalThis.window;
  try {
    for (const saved of [true, false]) {
      globalThis.window = { __TAURI__: { core: { invoke: async (command, args) => {
        assert.equal(command, 'save_export');
        assert.equal(args.filename, 'backup.json');
        assert.equal(new TextDecoder().decode(new Uint8Array(args.bytes)), '{"name":"⌨️"}');
        return saved;
      } } } };
      assert.equal(await saveDownload(new Blob(['{"name":"⌨️"}']), 'backup.json'), saved);
    }
    let message;
    globalThis.window = {
      __TAURI__: { core: { invoke: async () => { throw new Error('Disk full'); } } },
      alert: value => { message = value; }
    };
    assert.equal(await saveDownload(new Blob(['data']), 'backup.json'), false);
    assert.match(message, /Disk full/);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
