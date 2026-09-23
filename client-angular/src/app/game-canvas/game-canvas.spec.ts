import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameCanvas } from './game-canvas';

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

describe('GameCanvas', () => {
  let component: GameCanvas;
  let fixture: ComponentFixture<GameCanvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameCanvas],
    }).compileComponents();

    fixture = TestBed.createComponent(GameCanvas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
