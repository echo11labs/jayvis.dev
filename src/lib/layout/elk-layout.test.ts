import { describe, expect, it } from 'vitest';
import { positionsCollapsed } from './elk-layout';

describe('positionsCollapsed', () => {
  it('is true when tables share one point', () => {
    expect(
      positionsCollapsed([
        { position: { x: 0, y: 0 } },
        { position: { x: 0, y: 0 } },
      ]),
    ).toBe(true);
  });

  it('is false when tables are already placed apart', () => {
    expect(
      positionsCollapsed([
        { position: { x: 0, y: 0 } },
        { position: { x: 320, y: 40 } },
      ]),
    ).toBe(false);
  });
});
