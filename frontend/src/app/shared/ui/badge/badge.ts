import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': "'badge tone-' + tone()" },
  template: `<ng-content />`,
})
export class Badge {
  readonly tone = input.required<string>();
}
