import { describe, expect, it } from 'vitest';
import { toolsForJourneyStep } from './tool-sequence';

describe('browser tool ordering', () => {
  it('opens the homepage before allowing a page read', () => {
    expect(toolsForJourneyStep(0, 'idle', false)).toEqual({
      activeTools: ['startJourney'],
      toolChoice: { type: 'tool', toolName: 'startJourney' },
    });
    expect(toolsForJourneyStep(1, 'navigating', true)).toEqual({
      activeTools: ['readPage'],
      toolChoice: { type: 'tool', toolName: 'readPage' },
    });
  });

  it('requires reading each newly visited page before navigating again', () => {
    expect(toolsForJourneyStep(2, 'navigating', false).activeTools).toContain('followLink');
    expect(toolsForJourneyStep(3, 'navigating', true).activeTools).toEqual(['readPage']);
    expect(toolsForJourneyStep(3, 'found', true).activeTools).toEqual(['readPage']);
    expect(toolsForJourneyStep(4, 'found', false).activeTools).toEqual(['closeBrowser']);
  });

  it('offers no browser tools after an error or handoff', () => {
    expect(toolsForJourneyStep(1, 'error', true)).toEqual({ activeTools: [], toolChoice: 'none' });
    expect(toolsForJourneyStep(3, 'user_in_control', false)).toEqual({ activeTools: [], toolChoice: 'none' });
  });
});
