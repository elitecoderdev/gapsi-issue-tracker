import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { PageTitleStrategy } from './page-title.strategy';

@Component({ template: '' })
class BlankPage {}

describe('PageTitleStrategy', () => {
  let router: Router;
  let title: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'titled', title: 'Incidencias', component: BlankPage },
          { path: 'untitled', component: BlankPage },
        ]),
        { provide: TitleStrategy, useClass: PageTitleStrategy },
      ],
    });
    router = TestBed.inject(Router);
    title = TestBed.inject(Title);
  });

  it('appends the application name to the route title', async () => {
    await router.navigateByUrl('/titled');

    expect(title.getTitle()).toBe('Incidencias · IssueDesk');
  });

  it('falls back to the application name when the route has no title', async () => {
    await router.navigateByUrl('/untitled');

    expect(title.getTitle()).toBe('IssueDesk');
  });
});
