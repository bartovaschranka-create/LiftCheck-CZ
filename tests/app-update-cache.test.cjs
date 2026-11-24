const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');

test('Service worker activation removes only older LiftCheck caches', async () => {
  const {cacheName} = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
  const previous = 'liftcontrol-cz-v1-6-5-398';
  const keys = new Set([previous, cacheName, 'other-app-offline-cache']);
  const handlers = {};
  let claimed = false;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), {
    caches: {
      keys: async () => [...keys],
      delete: async key => keys.delete(key)
    },
    self: {
      addEventListener: (name, handler) => { handlers[name] = handler; },
      clients: {
        claim: async () => { claimed = true; }
      }
    }
  });

  let activated;
  handlers.activate({waitUntil: operation => { activated = operation; }});
  await activated;
  assert.deepEqual([...keys], [cacheName, 'other-app-offline-cache']);
  assert.equal(claimed, true);
});
