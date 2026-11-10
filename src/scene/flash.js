// 声音视角：发声零件同步闪光
// 用材质替换实现（克隆一份加 emissive），不改动共享材质，结束后精确换回
import { state } from '../core/state.js';
import { ACCENT } from './stage.js';

export function createFlash(getScooter) {
  let flash = null;

  function flashPart(id) {
    const scooter = getScooter();
    if (!scooter || state.view !== 'sound') return;
    const part = (scooter.parts || []).find((p) => p.id === id);
    if (!part || !part.object) return;
    restoreFlash();
    const entries = [];
    part.object.traverse((o) => {
      if (!o.isMesh) return;
      const orig = Array.isArray(o.material) ? o.material : [o.material];
      const clones = orig.map((m) => {
        if (!m || !m.emissive) return null;
        const c = m.clone();
        c.emissive.setHex(ACCENT);
        c.emissiveIntensity = 1.8;
        return c;
      });
      // 材质没有 emissive（如 Basic）时跳过该网格，避免置空材质
      if (clones.some((c) => !c)) return;
      o.userData._origMat = o.material;
      o.material = Array.isArray(o.material) ? clones : clones[0];
      entries.push({ mesh: o, clones });
    });
    if (entries.length) flash = { entries, t: 0, dur: 0.35 };
  }

  function restoreFlash() {
    if (!flash) return;
    for (const en of flash.entries) {
      en.mesh.material = en.mesh.userData._origMat;
      delete en.mesh.userData._origMat;
      for (const c of en.clones) if (c) c.dispose();
    }
    flash = null;
  }

  function updateFlash(dt) {
    if (!flash) return;
    flash.t += dt;
    const k = Math.min(flash.t / flash.dur, 1);
    const boost = 1.8 * (1 - k);
    for (const en of flash.entries) {
      for (const c of en.clones) if (c) c.emissiveIntensity = boost;
    }
    if (k >= 1) restoreFlash();
  }

  return { flashPart, restoreFlash, updateFlash };
}
