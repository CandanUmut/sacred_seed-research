import { defineComponent, Types } from 'bitecs';

export const Player = defineComponent({
  id: Types.ui32,
  stamina: Types.f32,
  capacitation: Types.f32,
  hyperactive: Types.ui8,
  finished: Types.ui8,
});
