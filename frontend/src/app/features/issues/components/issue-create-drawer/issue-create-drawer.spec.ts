import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '@core/notifications/toast.service';
import { CreateIssuePayload, Issue } from '@features/issues/data/issue.models';
import { IssuesStore } from '@features/issues/data/issues.store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { buildIssue } from '../../../../testing/issue-factory';
import { IssueCreateDrawer } from './issue-create-drawer';

describe('IssueCreateDrawer', () => {
  const create = vi.fn<(payload: CreateIssuePayload) => Observable<Issue>>();
  const closed = vi.fn<() => void>();
  const created = vi.fn<(issue: Issue) => void>();
  let fixture: ComponentFixture<IssueCreateDrawer>;
  let element: HTMLElement;
  let toast: ToastService;

  beforeEach(async () => {
    create.mockReset();
    closed.mockReset();
    created.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: IssuesStore, useValue: { create } }] });
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
    vi.spyOn(toast, 'error');
    fixture = TestBed.createComponent(IssueCreateDrawer);
    element = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentInstance.created.subscribe(created);
    await fixture.whenStable();
  });

  function titleInput(): HTMLInputElement {
    return element.querySelector<HTMLInputElement>('input.input')!;
  }

  function descriptionInput(): HTMLTextAreaElement {
    return element.querySelector<HTMLTextAreaElement>('textarea')!;
  }

  function type(control: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    control.value = value;
    control.dispatchEvent(new Event('input'));
  }

  function errors(): string[] {
    return Array.from(element.querySelectorAll('.field__error')).map((error) => error.textContent ?? '');
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function fillValidForm(): Promise<void> {
    type(titleInput(), '  Error al guardar  ');
    type(descriptionInput(), '  No se guarda el pedido  ');
    priorityOptions()[0]!.querySelector('input')!.click();
    await fixture.whenStable();
  }

  function priorityOptions(): HTMLLabelElement[] {
    return Array.from(element.querySelectorAll<HTMLLabelElement>('.priority__option'));
  }

  it('focuses the title and defaults to medium priority', () => {
    expect(document.activeElement).toBe(titleInput());
    expect(priorityOptions().map((option) => option.textContent?.trim())).toEqual(['Alta', 'Media', 'Baja']);
    expect(priorityOptions().map((option) => option.querySelector('input')!.checked)).toEqual([false, true, false]);
  });

  it('shows validation errors instead of submitting an empty form', async () => {
    await submit();

    expect(create).not.toHaveBeenCalled();
    expect(errors()).toEqual(['Este campo es obligatorio.', 'Este campo es obligatorio.']);
    expect(titleInput().classList).toContain('is-invalid');
  });

  it('rejects whitespace-only values', async () => {
    type(titleInput(), '    ');
    type(descriptionInput(), '   ');
    await submit();

    expect(create).not.toHaveBeenCalled();
    expect(errors()).toEqual(['No puede contener solo espacios.', 'No puede contener solo espacios.']);
  });

  it('shows the description length counter', async () => {
    type(descriptionInput(), 'abc');
    await fixture.whenStable();

    expect(element.querySelector('.field__hint')!.textContent).toBe('3 / 2000');
  });

  it('creates the issue with trimmed values and notifies the parent', async () => {
    const issue = buildIssue();
    create.mockReturnValue(of(issue));
    await fillValidForm();

    await submit();

    expect(create).toHaveBeenCalledWith({
      title: 'Error al guardar',
      description: 'No se guarda el pedido',
      priority: 'high',
    });
    expect(toast.success).toHaveBeenCalledWith('Incidencia creada correctamente.');
    expect(created).toHaveBeenCalledWith(issue);
  });

  it('shows an error toast when the creation fails', async () => {
    create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await fillValidForm();

    await submit();

    expect(toast.error).toHaveBeenCalledWith('No fue posible crear la incidencia.');
    expect(created).not.toHaveBeenCalled();
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });

  it('closes from the close button, the cancel button, the backdrop and the escape key', () => {
    element.querySelector<HTMLButtonElement>('.drawer__close')!.click();
    element.querySelector<HTMLButtonElement>('.drawer__footer .btn--ghost')!.click();
    element.querySelector<HTMLElement>('.backdrop')!.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closed).toHaveBeenCalledTimes(4);
  });

  it('ignores close and resubmit attempts while saving', async () => {
    const response = new Subject<Issue>();
    create.mockReturnValue(response);
    await fillValidForm();

    await submit();
    const submitButton = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toContain('Guardando');

    await submit();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    element.querySelector<HTMLElement>('.backdrop')!.click();

    expect(create).toHaveBeenCalledTimes(1);
    expect(closed).not.toHaveBeenCalled();

    response.next(buildIssue());
    response.complete();
    await fixture.whenStable();

    expect(submitButton.disabled).toBe(false);
    expect(created).toHaveBeenCalled();
  });
});
