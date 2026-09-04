import { describe, it, expect } from 'vitest';
import { isIOSRequiresInstall } from './pushManager';

describe('PushManager Client Utilities', () => {
  it('should detect non-iOS or desktop environments cleanly', () => {
    // In Node / JSDOM test environment without iOS user agent
    const requiresInstall = isIOSRequiresInstall();
    expect(requiresInstall).toBe(false);
  });
});
