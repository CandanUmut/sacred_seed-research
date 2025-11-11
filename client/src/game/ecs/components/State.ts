import { defineComponent, Types } from 'bitecs';

export const State = defineComponent({
  progress: Types.f32,
  region: Types.ui8,
  stunTimer: Types.f32,
  hyperTimer: Types.f32,
  hyperCooldown: Types.f32,
});
