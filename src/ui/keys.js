// 键盘输入：只写 state.input 并发 bus 事件，不直接操作 3D 对象
import { state } from '../core/state.js';
import { emit } from '../core/bus.js';

const VIEW_KEYS = { '1': 'ride', '2': 'drive', '3': 'inspect', '4': 'sound' };

export function createKeys(handlers = {}) {
  function editable(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function onKeyDown(e) {
    if (editable(e.target)) return;
    const k = e.key;

    // 防止页面滚动（输入控件内交给原生行为）
    if (k === ' ' || k.startsWith('Arrow')) e.preventDefault();

    // 持续键：按住期间保持数值
    switch (k) {
      case 'w': case 'W': case 'ArrowUp':
        state.input.throttle = 1;
        return;
      case 's': case 'S': case 'ArrowDown':
        state.input.brake = 1;
        return;
      case 'a': case 'A': case 'ArrowLeft':
        state.input.steer = -1;
        return;
      case 'd': case 'D': case 'ArrowRight':
        state.input.steer = 1;
        return;
    }

    if (e.repeat) return;

    switch (k) {
      case 'q': case 'Q':
        emit('light:toggle', { which: 'left' });
        break;
      case 'e': case 'E':
        emit('light:toggle', { which: 'right' });
        break;
      case 'h': case 'H':
        emit('horn');
        break;
      case 'l': case 'L':
        emit('light:toggle', { which: 'head' });
        break;
      case 'f': case 'F':
        emit('box:toggle');
        break;
      case 'x': case 'X':
        handlers.setCutaway?.(!state.cutaway);
        break;
      default: {
        const view = VIEW_KEYS[k];
        if (view) handlers.setView?.(view);
      }
    }
  }

  function onKeyUp(e) {
    if (editable(e.target)) return;
    switch (e.key) {
      case 'w': case 'W': case 'ArrowUp':
        state.input.throttle = 0;
        break;
      case 's': case 'S': case 'ArrowDown':
        state.input.brake = 0;
        break;
      case 'a': case 'A': case 'ArrowLeft':
      case 'd': case 'D': case 'ArrowRight':
        state.input.steer = 0;
        break;
    }
  }

  function onBlur() {
    state.input.throttle = 0;
    state.input.brake = 0;
    state.input.steer = 0;
  }

  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('blur', onBlur);

  return { onBlur };
}
