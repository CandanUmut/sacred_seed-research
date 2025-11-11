export interface TouchSnapshot {
  u: boolean;
  d: boolean;
  l: boolean;
  r: boolean;
  ha: boolean;
}

type Listener = () => void;

export class TouchControls {
  private readonly container: HTMLElement;
  private readonly joystick: HTMLDivElement;
  private readonly hyperButton: HTMLButtonElement;
  private readonly performanceButton: HTMLButtonElement;
  private readonly state: TouchSnapshot = { u: false, d: false, l: false, r: false, ha: false };
  private startX = 0;
  private startY = 0;
  private active = false;
  private listeners: Listener[] = [];

  constructor(root: HTMLElement = document.body) {
    this.container = document.createElement('div');
    this.container.className = 'touch-controls';
    this.joystick = document.createElement('div');
    this.joystick.className = 'touch-joystick';
    this.hyperButton = document.createElement('button');
    this.hyperButton.className = 'touch-button touch-hyper';
    this.hyperButton.textContent = 'Hyper';
    this.performanceButton = document.createElement('button');
    this.performanceButton.className = 'touch-button touch-performance';
    this.performanceButton.textContent = 'Perf';

    this.container.append(this.joystick, this.hyperButton, this.performanceButton);
    root.appendChild(this.container);

    this.joystick.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);

    this.hyperButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.state.ha = true;
      this.notify();
    });
    this.hyperButton.addEventListener('pointerup', (event) => {
      event.preventDefault();
      this.state.ha = false;
      this.notify();
    });

    this.performanceButton.addEventListener('click', () => {
      for (const listener of this.listeners) listener();
    });
  }

  onPerformanceToggle(listener: Listener): void {
    this.listeners.push(listener);
  }

  getState(): TouchSnapshot {
    return { ...this.state };
  }

  destroy(): void {
    this.joystick.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.container.remove();
    this.listeners = [];
  }

  private onPointerDown = (event: PointerEvent) => {
    this.active = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.joystick.setPointerCapture(event.pointerId);
    this.updateFromDelta(0, 0);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.active) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    this.updateFromDelta(dx, dy);
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.active) return;
    this.active = false;
    try {
      this.joystick.releasePointerCapture(event.pointerId);
    } catch (error) {
      // ignore pointer release errors
    }
    this.state.u = this.state.d = this.state.l = this.state.r = false;
    this.notify();
  };

  private updateFromDelta(dx: number, dy: number): void {
    const deadZone = 12;
    this.state.u = dy < -deadZone;
    this.state.d = dy > deadZone;
    this.state.l = dx < -deadZone;
    this.state.r = dx > deadZone;
    this.notify();
  }

  private notify(): void {
    this.container.dataset.state = JSON.stringify(this.state);
  }
}
