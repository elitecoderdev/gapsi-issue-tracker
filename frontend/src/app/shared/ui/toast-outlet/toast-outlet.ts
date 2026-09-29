import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@core/notifications/toast.service';

@Component({
  selector: 'app-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div [class]="'toast toast--' + toast.tone" role="status">
          <span class="toast__dot"></span>
          <span class="toast__message">{{ toast.message }}</span>
          <button type="button" class="toast__close" aria-label="Cerrar" (click)="toastService.dismiss(toast.id)">×</button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-outlet.scss',
})
export class ToastOutlet {
  protected readonly toastService = inject(ToastService);
}
