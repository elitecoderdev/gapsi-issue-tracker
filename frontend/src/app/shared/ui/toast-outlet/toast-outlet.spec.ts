import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '@core/notifications/toast.service';
import { ToastOutlet } from './toast-outlet';

describe('ToastOutlet', () => {
  let fixture: ComponentFixture<ToastOutlet>;
  let toasts: ToastService;

  beforeEach(async () => {
    toasts = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastOutlet);
    await fixture.whenStable();
  });

  function renderedToasts(): HTMLElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.toast'));
  }

  it('renders every active toast with its tone', async () => {
    toasts.success('Saved');
    toasts.error('Failed');
    await fixture.whenStable();

    const rendered = renderedToasts();
    expect(rendered.map((toast) => toast.className)).toEqual(['toast toast--success', 'toast toast--error']);
    expect(rendered.map((toast) => toast.querySelector('.toast__message')!.textContent)).toEqual(['Saved', 'Failed']);
  });

  it('dismisses a toast from its close button', async () => {
    toasts.info('Heads up');
    await fixture.whenStable();

    renderedToasts()[0]!.querySelector<HTMLButtonElement>('.toast__close')!.click();
    await fixture.whenStable();

    expect(renderedToasts()).toHaveLength(0);
  });
});
