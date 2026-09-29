import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ValidationErrors, Validators } from '@angular/forms';
import { notBlank } from '@shared/forms/validators';
import { FieldError } from './field-error';

describe('FieldError', () => {
  let fixture: ComponentFixture<FieldError>;
  let control: FormControl<string>;

  beforeEach(async () => {
    control = new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(5), notBlank],
    });
    fixture = TestBed.createComponent(FieldError);
    fixture.componentRef.setInput('control', control);
    await fixture.whenStable();
  });

  function message(): string | null {
    return (fixture.nativeElement as HTMLElement).querySelector('.field__error')?.textContent ?? null;
  }

  async function touchWith(value: string): Promise<void> {
    control.setValue(value);
    control.markAsTouched();
    await fixture.whenStable();
  }

  it('stays hidden while the control is untouched', async () => {
    control.setValue('');
    await fixture.whenStable();

    expect(message()).toBeNull();
  });

  it.each([
    ['', 'Este campo es obligatorio.'],
    ['ab', 'Debe tener al menos 3 caracteres.'],
    ['abcdef', 'como máximo 5 caracteres.'],
    ['    ', 'No puede contener solo espacios.'],
  ])('shows the message for %o', async (value, expected) => {
    await touchWith(value);

    expect(message()).toContain(expected);
  });

  it('hides the message once the control becomes valid', async () => {
    await touchWith('');
    await touchWith('valid');

    expect(message()).toBeNull();
  });

  it('shows a generic message for unknown errors', async () => {
    control.markAsTouched();
    control.setErrors({ custom: true });
    await fixture.whenStable();

    expect(message()).toBe('Valor inválido.');
  });

  it('shows nothing when the error map is empty', async () => {
    control.markAsTouched();
    control.setErrors({} as ValidationErrors);
    await fixture.whenStable();

    expect(message()).toBeNull();
  });

  it('follows a replaced control', async () => {
    const replacement = new FormControl('', { nonNullable: true, validators: Validators.required });
    fixture.componentRef.setInput('control', replacement);
    await fixture.whenStable();

    replacement.markAsTouched();
    await fixture.whenStable();

    expect(message()).toBe('Este campo es obligatorio.');
  });
});
