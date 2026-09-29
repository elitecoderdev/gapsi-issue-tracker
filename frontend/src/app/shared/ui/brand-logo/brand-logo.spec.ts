import { TestBed } from '@angular/core/testing';
import { BrandLogo } from './brand-logo';

describe('BrandLogo', () => {
  function iconSize(fixtureElement: HTMLElement): string | null {
    return fixtureElement.querySelector('svg')!.getAttribute('width');
  }

  it('renders the brand name with the default size', async () => {
    const fixture = TestBed.createComponent(BrandLogo);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(iconSize(element)).toBe('28');
    expect(element.querySelector('.brand-name')!.textContent).toBe('IssueDesk');
  });

  it('accepts a custom size', async () => {
    const fixture = TestBed.createComponent(BrandLogo);
    fixture.componentRef.setInput('size', 34);
    await fixture.whenStable();

    expect(iconSize(fixture.nativeElement as HTMLElement)).toBe('34');
  });
});
