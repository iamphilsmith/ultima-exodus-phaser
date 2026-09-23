import { vi } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

vi.mock('phaser', () => {
  class MockScene {
    constructor(_key?: string) {}
  }
  class MockGame {
    destroy(): void {}
  }
  const mockPhaser: any = {
    AUTO: 0,
    Scene: MockScene,
    Game: MockGame,
  };
  mockPhaser.default = mockPhaser;
  return mockPhaser;
});

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClientTesting()],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
