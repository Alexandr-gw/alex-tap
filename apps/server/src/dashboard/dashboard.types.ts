export type BriefingFacts = {
  today: {
    total: number;
    completed: number;
    pending: number;
  };
  risks: {
    lateJobs: number;
    unpaid: number;
    jobsNeedingConfirmation: number;
  };
  capacity: {
    unassignedJobsCount: number;
    overloaded: Array<{
      worker: string;
      day: string;
      jobs: number;
      scheduledMinutes: number;
    }>;
  };
  trends: {
    topService: string | null;
    peakBookingWindow: string | null;
  };
};

export type BriefingContent = {
  summary: string;
  alerts: string[];
  insights: string[];
};

export type DashboardBriefingResponseDto = {
  facts: BriefingFacts;
  briefing: BriefingContent;
  source: 'RULES' | 'AI';
  usedFallback: boolean;
  generatedAt: string;
};
