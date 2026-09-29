import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 5l4.5 4.5L16 14l-4.5-4.5L16 5zm-6.5 6.5L14 16l-4.5 4.5L5 16l4.5-4.5zm13 0L27 16l-4.5 4.5L18 16l4.5-4.5zM16 18l4.5 4.5L16 27l-4.5-4.5L16 18z"
        fill="var(--brand)"
      />
    </svg>
    <span class="brand-name">Issue<strong>Desk</strong></span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .brand-name {
      font-size: 18px;
      font-weight: 500;
      letter-spacing: -0.2px;

      strong {
        color: var(--brand);
        font-weight: 700;
      }
    }
  `,
})
export class BrandLogo {
  readonly size = input(28);
}
