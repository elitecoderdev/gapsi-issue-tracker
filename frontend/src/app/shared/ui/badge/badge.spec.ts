import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Badge } from './badge';

@Component({
  imports: [Badge],
  template: `<app-badge tone="muted">admin</app-badge>`,
})
class BadgeHost {}

describe('Badge', () => {
  it('renders the projected content with the tone class', async () => {
    const fixture = TestBed.createComponent(BadgeHost);
    await fixture.whenStable();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('app-badge')!;
    expect(badge.className).toBe('badge tone-muted');
    expect(badge.textContent).toBe('admin');
  });
});
