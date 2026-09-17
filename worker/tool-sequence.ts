import type { JourneyStatus } from './journey-policy';

export type JourneyToolName =
  | 'startJourney'
  | 'readPage'
  | 'followLink'
  | 'finishJourney'
  | 'screenshot'
  | 'closeBrowser';

type ToolSelection = {
  activeTools: JourneyToolName[];
  toolChoice?: 'none' | { type: 'tool'; toolName: JourneyToolName };
};

export function toolsForJourneyStep(
  stepNumber: number,
  status: JourneyStatus,
  pageNeedsRead: boolean,
): ToolSelection {
  if (stepNumber === 0) {
    return {
      activeTools: ['startJourney'],
      toolChoice: { type: 'tool', toolName: 'startJourney' },
    };
  }
  if ((status === 'navigating' || status === 'found') && pageNeedsRead) {
    return {
      activeTools: ['readPage'],
      toolChoice: { type: 'tool', toolName: 'readPage' },
    };
  }
  if (status === 'navigating') {
    return { activeTools: ['followLink', 'finishJourney', 'screenshot', 'closeBrowser'] };
  }
  if (status === 'found') {
    return { activeTools: ['closeBrowser'] };
  }
  return { activeTools: [], toolChoice: 'none' };
}
