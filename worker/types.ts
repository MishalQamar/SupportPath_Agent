export type EvidenceItem = {
  key: string;
  url: string;
  title: string;
  hop: number;
  capturedAt: string;
};

export type BrowserAgentState = {
  liveUrl: string | null;
  evidence: EvidenceItem[];
  route: string[];
  hopCount: number;
};
