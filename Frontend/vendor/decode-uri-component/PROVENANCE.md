# Decoder security backport

Source: npm decode-uri-component 0.5.1 (MIT), https://github.com/SamVerschueren/decode-uri-component.
Downloaded tarball SHA-1: 7f66b25bf435df723f9af55713dcf860a1c297d2.

The patched upstream linear decoder is unchanged. Only the module export is adapted to CommonJS and the legacy 0.2.x plus-to-space behavior is retained. This preserves query-string 7 / Expo Router 57 compatibility without an Expo major upgrade. Replace this vendored package when an SDK-supported upstream caller resolves the patched dependency. See tests/dependency-security.test.ts.
