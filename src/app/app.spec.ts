import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  it('hosts the routed application', async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });
});
