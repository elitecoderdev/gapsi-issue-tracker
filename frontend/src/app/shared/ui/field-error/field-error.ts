import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { switchMap } from 'rxjs';

type ErrorFormatter = (details: ValidationErrors[string]) => string;

const ERROR_MESSAGES: Record<string, ErrorFormatter> = {
  required: () => 'Este campo es obligatorio.',
  minlength: (details: { requiredLength: number }) => `Debe tener al menos ${details.requiredLength} caracteres.`,
  maxlength: (details: { requiredLength: number }) => `Debe tener como máximo ${details.requiredLength} caracteres.`,
  whitespace: () => 'No puede contener solo espacios.',
};

@Component({
  selector: 'app-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message(); as text) {
      <span class="field__error" role="alert">{{ text }}</span>
    }
  `,
})
export class FieldError {
  readonly control = input.required<AbstractControl>();

  private readonly version = signal(0);

  protected readonly message = computed(() => {
    this.version();
    const control = this.control();
    if (!control.touched || !control.errors) {
      return null;
    }
    const [key, details] = Object.entries(control.errors)[0] ?? [];
    return key ? (ERROR_MESSAGES[key]?.(details) ?? 'Valor inválido.') : null;
  });

  constructor() {
    toObservable(this.control)
      .pipe(
        switchMap((control) => control.events),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.version.update((value) => value + 1));
  }
}
