import { ToolDefinition } from '../../../core/models/tool.model';

export const cronExpressionStudioTool: ToolDefinition = {
  id: 'cron-expression-studio',
  name: 'Cron Expression Builder, Human Explainer & Schedule Simulator',
  category: 'dev',
  description:
    'Build, validate, explain in English/Spanish, and simulate 5-field and 6-field cron execution schedules across IANA timezones with DST awareness.',
  keywords: [
    'cron generator',
    'cron parser',
    'cron explainer',
    'crontab simulator',
    'kubernetes cronjob',
    'github actions cron',
  ],
  icon: '⏰',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./cron-expression-studio.component').then(
      (m) => m.CronExpressionStudioComponent
    ),
};
