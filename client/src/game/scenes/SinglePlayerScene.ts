import { Container, Graphics, Text } from 'pixi.js';
import { initWorld } from '../ecs/world.js';
import { createInputSystem } from '../ecs/systems/InputSystem.js';
import { createFlowFieldSystem } from '../ecs/systems/FlowFieldSystem.js';
import { createBiologyGateSystem } from '../ecs/systems/BiologyGateSystem.js';
import { createMovementSystem } from '../ecs/systems/MovementSystem.js';
import { createCollisionSystem } from '../ecs/systems/CollisionSystem.js';
import { createPowerupSystem } from '../ecs/systems/PowerupSystem.js';
import { RenderSystem } from '../ecs/systems/RenderSystem.js';
import type { Scene, SceneManager } from './SceneManager.js';
import { Hud } from '../ui/Hud.js';
import { Tooltips } from '../ui/Tooltips.js';
import { createRegionBackdrop } from '../maps/TileGen.js';
import { REGION_IDS } from '@sperm-odyssey/shared';
import { Player } from '../ecs/components/Player.js';
import { State } from '../ecs/components/State.js';
import { Region } from '../ecs/components/Region.js';

export class SinglePlayerScene implements Scene {
  container = new Container();
  private background = new Graphics();
  private context: ReturnType<typeof initWorld>;
  private systems = [
    createInputSystem(),
    createFlowFieldSystem(),
    createBiologyGateSystem(),
    createPowerupSystem(),
    createMovementSystem(),
  ];
  private collision: ReturnType<typeof createCollisionSystem>;
  private renderer = new RenderSystem(this);
  private hud = new Hud(this.manager);
  private tooltips = new Tooltips();
  private intro = new Text({
    text: 'Use WASD or arrow keys to navigate. Press Space for hyperactivation bursts!',
    style: { fill: 0xffffff, fontSize: 20, wordWrap: true, wordWrapWidth: 640 },
  });

  constructor(private manager: SceneManager) {
    this.context = initWorld(manager.app);
    this.collision = createCollisionSystem({ width: 1280, height: 720 });
    this.container.addChild(this.background, this.hud.container, this.tooltips.container, this.intro);
    Region.id[this.context.entities.player] = REGION_IDS.indexOf('vagina');
  }

  update(delta: number): void {
    this.context.delta = delta;
    this.context.elapsed += delta / 60;
    let world = this.context.world;
    for (const system of this.systems) {
      world = system(world, delta);
    }
    world = this.collision(world, delta);
    this.renderer.run(world);

    const eid = this.context.entities.player;
    const stamina = Player.stamina[eid];
    const capacitation = Player.capacitation[eid];
    const progress = State.progress[eid];
    this.hud.update(stamina, capacitation, progress);
    if (this.context.elapsed < 6) {
      this.tooltips.show({
        title: 'Tutorial',
        description: 'Fluid flows will nudge you forward. Collect capacitation to pass key checkpoints.',
      });
    } else {
      this.tooltips.hide();
    }
  }

  onResize(width: number, height: number): void {
    createRegionBackdrop(this.manager.app, this.background);
    this.hud.onResize(width, height);
    this.tooltips.onResize(width, height);
    this.intro.position.set(width / 2 - 320, height - 140);
    this.collision = createCollisionSystem({ width, height });
  }

  onEnter(): void {
    this.context.elapsed = 0;
  }

  onExit(): void {}
}
