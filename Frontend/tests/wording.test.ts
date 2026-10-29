import { describe, expect, it } from 'vitest';

import { plainComparison } from '@/features/analysis/wording';

describe('Needs Attention comparison sentence', () => {
  it('describes reach and views shortfalls against the account’s usual', () => {
    expect(plainComparison('-100% reach vs your median (325)')).toBe('100% lower reach than your usual of 325');
    expect(plainComparison('-8% reach vs your median (1,050)')).toBe('8% lower reach than your usual of 1,050');
    expect(plainComparison('-99% views vs your median (3,000)')).toBe('99% fewer views than your usual of 3,000');
  });
});
