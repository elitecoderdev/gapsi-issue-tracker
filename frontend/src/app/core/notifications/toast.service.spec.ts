import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  it('shows toasts with the matching tone', () => {
    service.success('Saved');
    service.error('Failed');
    service.info('Heads up');

    expect(service.toasts().map(({ tone, message }) => ({ tone, message }))).toEqual([
      { tone: 'success', message: 'Saved' },
      { tone: 'error', message: 'Failed' },
      { tone: 'info', message: 'Heads up' },
    ]);
  });

  it('keeps only the three most recent toasts', () => {
    ['one', 'two', 'three', 'four'].forEach((message) => service.info(message));

    expect(service.toasts().map((toast) => toast.message)).toEqual(['two', 'three', 'four']);
  });

  it('dismisses a toast by id', () => {
    service.success('first');
    service.success('second');
    const [first] = service.toasts();

    service.dismiss(first!.id);

    expect(service.toasts().map((toast) => toast.message)).toEqual(['second']);
  });

  it('dismisses toasts automatically after their lifetime', () => {
    service.success('Saved');

    vi.advanceTimersByTime(3999);
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });
});
