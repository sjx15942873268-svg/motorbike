// 桩：场景动效Agent 替换此文件
import { state } from '../core/state.js';
import { on } from '../core/bus.js';

export function createSim() {
  function update(dt) {
    // 桩：不做任何事
  }
  on('box:toggle', () => { state.box.open = !state.box.open; });
  on('light:toggle', (d) => { if (state.lights[d.which] !== undefined) state.lights[d.which] = !state.lights[d.which]; });
  return { update };
}
