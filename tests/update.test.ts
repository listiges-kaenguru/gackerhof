import { describe, expect, it } from 'vitest';
import { compareVersions, versionFromTag } from '../src/ui/update';

describe('Versionsprüfung', () => {
  it('vergleicht Versionen numerisch', () => {
    expect(compareVersions('0.3.10', '0.3.9')).toBeGreaterThan(0);
    expect(compareVersions('0.3.3', '0.3.3')).toBe(0);
    expect(compareVersions('0.3.3', '1.0.0')).toBeLessThan(0);
  });
  it('liest die Version aus dem Release-Tag', () => {
    expect(versionFromTag('v0.3.3')).toBe('0.3.3');
    expect(versionFromTag('0.4.0')).toBe('0.4.0');
    expect(versionFromTag('v1.0.0-beta')).toBeNull();
    expect(versionFromTag(undefined)).toBeNull();
  });
});
