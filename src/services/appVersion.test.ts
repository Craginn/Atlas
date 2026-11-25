import { describe, expect, it } from 'vitest';
import { APP_VERSION } from './appVersion';
import pkg from '../../package.json';

describe('APP_VERSION', () => {
  it('is the package.json version', () => {
    expect(APP_VERSION).toBe(pkg.version);
  });
});
