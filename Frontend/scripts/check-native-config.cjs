const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const eas = require('../eas.json');
const config = JSON.parse(execFileSync(process.execPath, [path.join(root, 'node_modules/expo/bin/cli'), 'config', '--type', 'introspect', '--json'], {
  cwd: root,
  env: { ...process.env, CI: '1', EXPO_NO_DOTENV: '1', EXPO_PUBLIC_API_BASE_URL: 'https://api.ci.invalid' },
  encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
}));
const ios = config._internal.modResults.ios;
assert.equal(ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads, false, 'iOS must enforce App Transport Security');
assert.ok(ios.infoPlist.CFBundleURLTypes.some(type => type.CFBundleURLSchemes.includes('medianavigator')), 'native callback scheme missing');
assert.equal(config.ios.bundleIdentifier, config.android.package, 'platform application IDs differ');
assert.equal(config.android.allowBackup, false);
const production = eas.build.production;
assert.equal(production.distribution, 'store');
assert.equal(production.credentialsSource, 'remote');
assert.equal(production.android.buildType, 'app-bundle');
assert.equal(production.ios.simulator, false);
assert.equal(production.ios.buildConfiguration, 'Release');
assert.equal(new URL(production.env.EXPO_PUBLIC_API_BASE_URL).protocol, 'https:');
console.log('PASS native transport, callback scheme, application IDs and store-build configuration (signing credentials not checked).');
