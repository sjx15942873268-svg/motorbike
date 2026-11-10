// 本地记录：localStorage `rider01.log`
// { odometer, orders, rideSeconds, history: [{ date, km, orders }] }
// 读写都包 try/catch：隐私模式 / 配额满时只留内存，界面不报错
import { state } from '../core/state.js';
import { on } from '../core/bus.js';

const KEY = 'rider01.log';

function emptyLog() {
  return { odometer: 0, orders: 0, rideSeconds: 0, history: [], baseline: null };
}

// 内存副本：localStorage 不可用时唯一存储
let mem = emptyLog();

function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function loadLog() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...mem };
    const data = JSON.parse(raw);
    const log = {
      odometer: Number(data.odometer) || 0,
      orders: Number(data.orders) || 0,
      rideSeconds: Number(data.rideSeconds) || 0,
      history: Array.isArray(data.history) ? data.history : [],
      baseline: data.baseline && typeof data.baseline === 'object'
        ? { date: String(data.baseline.date || ''), odo: Number(data.baseline.odo) || 0 }
        : null,
    };
    mem = log;
    return log;
  } catch (err) {
    return { ...mem };
  }
}

export function saveLog(log) {
  mem = log;
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch (err) {
    // 隐私模式 / 配额满：静默降级为内存存储
  }
}

export function recordSnapshot() {
  const log = loadLog();
  log.odometer = state.ride.odometer;
  log.orders = state.ride.orders;
  log.rideSeconds = Math.floor(state.ride.rideSeconds);

  const date = todayKey();
  let base = log.baseline && log.baseline.date === date ? log.baseline : null;
  if (!base) {
    // 新的一天（或旧版本日志）：优先用当天已有记录反推，否则以当前里程为起点
    const existing = log.history.find((h) => h && h.date === date);
    base = { date, odo: existing ? state.ride.odometer - (Number(existing.km) || 0) : state.ride.odometer };
  }
  if (state.ride.odometer < base.odo - 1e-9) {
    // 里程被「清空」归零，当日重新起算
    base = { date, odo: state.ride.odometer };
  }
  log.baseline = base;
  const km = Math.max(0, state.ride.odometer - base.odo);

  const idx = log.history.findIndex((h) => h && h.date === date);
  if (idx >= 0) {
    log.history[idx].km = km;
    log.history[idx].orders = state.ride.orders;
  } else {
    log.history.push({ date, km, orders: state.ride.orders });
  }

  saveLog(log);
}

// 每次送达再存一次
on('order:delivered', () => recordSnapshot());

// 与 core/state.js 的单一定义保持一致
export { resetToday, clearAll } from '../core/state.js';
