import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { resolveErrorMessage } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { PRIORITY_META } from '@features/issues/data/issue.labels';
import { ISSUE_PRIORITIES, Issue, IssuePriority } from '@features/issues/data/issue.models';
import { IssuesStore } from '@features/issues/data/issues.store';
import { notBlank } from '@shared/forms/validators';
import { FieldError } from '@shared/ui/field-error/field-error';
import { finalize } from 'rxjs';

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 2000;

@Component({
  selector: 'app-issue-create-drawer',
  imports: [ReactiveFormsModule, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
  templateUrl: './issue-create-drawer.html',
  styleUrl: './issue-create-drawer.scss',
})
export class IssueCreateDrawer {
  private readonly store = inject(IssuesStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly titleInput = viewChild.required<ElementRef<HTMLInputElement>>('titleInput');

  readonly closed = output<void>();
  readonly created = output<Issue>();

  protected readonly priorities = ISSUE_PRIORITIES;
  protected readonly priorityMeta = PRIORITY_META;
  protected readonly titleMaxLength = TITLE_MAX_LENGTH;
  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;
  protected readonly isSubmitting = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(TITLE_MAX_LENGTH), notBlank]],
    description: ['', [Validators.required, Validators.maxLength(DESCRIPTION_MAX_LENGTH), notBlank]],
    priority: ['medium' as IssuePriority, Validators.required],
  });

  constructor() {
    afterNextRender(() => this.titleInput().nativeElement.focus());
  }

  protected close(): void {
    if (!this.isSubmitting()) {
      this.closed.emit();
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, description, priority } = this.form.getRawValue();
    this.isSubmitting.set(true);

    this.store
      .create({ title: title.trim(), description: description.trim(), priority })
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (issue) => {
          this.toast.success('Incidencia creada correctamente.');
          this.created.emit(issue);
        },
        error: (error: unknown) => this.toast.error(resolveErrorMessage(error, 'No fue posible crear la incidencia.')),
      });
  }
}
