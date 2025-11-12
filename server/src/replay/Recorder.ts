import { pack } from 'msgpackr';
import { ReplayBlob } from '@sperm-odyssey/shared';

export class Recorder {
  private readonly inputs: ReplayBlob['inputs'] = [];

  constructor(private readonly header: ReplayBlob['header']) {}

  addInput(input: ReplayBlob['inputs'][number]): void {
    this.inputs.push(input);
  }

  toBlob(): ReplayBlob {
    return { header: this.header, inputs: [...this.inputs] };
  }

  toBuffer(): Uint8Array {
    const data = pack(this.toBlob());
    return data instanceof Uint8Array
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : new Uint8Array(data);
  }
}
