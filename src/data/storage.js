// 桩：界面Agent 替换此文件
import { state } from '../core/state.js';
import { on } from '../core/bus.js';

const KEY = 'rider01.log';
const mem = {};

export function loadLog() {
  return { odometer: 0, orders: 0, rideSeconds: 0, history: [] };
}
export function saveLog() {}
export function recordSnapshot() {}
export function resetToday() {}
export function clearAll() {}
