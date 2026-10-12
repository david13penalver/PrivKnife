export type AuditStrategy = 'mobile' | 'desktop';
export type MetricRating = 'good' | 'needs-improvement' | 'poor';
export type DiagnosticPriority = 'high' | 'medium' | 'low';

export interface VitalMetric {
  id: string;
  name: string;
  shortName: string;
  value: number;
  formattedValue: string;
  unit: string;
  rating: MetricRating;
  description: string;
  goodThreshold: number;
  poorThreshold: number;
}

export interface DiagnosticTip {
  id: string;
  title: string;
  description: string;
  priority: DiagnosticPriority;
  estimatedSavingsMs?: number;
  estimatedSavingsBytes?: number;
  category: 'performance' | 'accessibility' | 'seo' | 'best-practices';
}

export interface CategoryScore {
  id: 'performance' | 'accessibility' | 'best-practices' | 'seo';
  title: string;
  score: number; // 0 - 100
  rating: MetricRating;
}

export interface VitalsAuditReport {
  url: string;
  strategy: AuditStrategy;
  timestamp: string;
  fetchTimeMs: number;
  overallScore: number; // 0 - 100
  categories: CategoryScore[];
  vitals: {
    lcp: VitalMetric;
    inp: VitalMetric;
    cls: VitalMetric;
    fcp: VitalMetric;
    ttfb: VitalMetric;
    speedIndex: VitalMetric;
  };
  diagnostics: DiagnosticTip[];
  lighthouseVersion?: string;
}

export interface PresetAuditSample {
  id: string;
  name: string;
  description: string;
  url: string;
  strategy: AuditStrategy;
  mockReport: VitalsAuditReport;
}
