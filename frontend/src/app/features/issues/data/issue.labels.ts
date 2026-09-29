import { IssuePriority, IssueStatus } from './issue.models';

export type Tone = 'green' | 'red' | 'orange' | 'blue' | 'brand' | 'muted';

export interface OptionMeta {
  readonly label: string;
  readonly tone: Tone;
}

export const STATUS_META: Readonly<Record<IssueStatus, OptionMeta>> = {
  open: { label: 'Abierta', tone: 'blue' },
  in_progress: { label: 'En progreso', tone: 'orange' },
  done: { label: 'Completada', tone: 'green' },
};

export const PRIORITY_META: Readonly<Record<IssuePriority, OptionMeta>> = {
  high: { label: 'Alta', tone: 'red' },
  medium: { label: 'Media', tone: 'brand' },
  low: { label: 'Baja', tone: 'muted' },
};
