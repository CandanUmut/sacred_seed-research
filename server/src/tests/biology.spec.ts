import { canPassGate } from '../sim/BiologyRules.js';

describe('Biology rules', () => {
  it('requires hyperactivation at ampulla', () => {
    expect(canPassGate('ampulla', 80, 4, true)).toBe(true);
    expect(canPassGate('ampulla', 80, 4, false)).toBe(false);
  });
});
