import { defineQuery } from 'bitecs';
import type { IWorld } from 'bitecs';
import { Graphics } from 'pixi.js';
import { Transform } from '../components/Transform.js';
import { Player } from '../components/Player.js';
import type { Scene } from '../../scenes/SceneManager.js';

export class RenderSystem {
  private query = defineQuery([Transform, Player]);
  private sprites = new Map<number, Graphics>();

  constructor(private scene: Scene) {}

  run(world: IWorld): IWorld {
    for (const eid of this.query(world)) {
      let sprite = this.sprites.get(eid);
      if (!sprite) {
        sprite = new Graphics();
        sprite.lineStyle(2, 0xffffff);
        sprite.beginFill(0x6cd6ff);
        sprite.drawCircle(0, 0, 12);
        sprite.endFill();
        this.scene.container.addChild(sprite);
        this.sprites.set(eid, sprite);
      }
      sprite.position.set(Transform.x[eid], Transform.y[eid]);
    }
    return world;
  }
}
