// 骑行模拟：简化物理、跑单、rig 动画（车轮/转向/侧倾/灯光/转向灯/箱盖/脚撑）
import { state } from '../core/state.js';
import { emit, on } from '../core/bus.js';
import { tween, kill } from '../core/tween.js';
import { MAX_SPEED, DIM } from '../core/config.js';

const WHEEL_R = DIM.wheelRadius;   // 0.20 m
const ACCEL = 3.0;
const DRAG_BASE = 0.4;
const DRAG_Q = 0.02;
const BRAKE_DECEL = 6.0;
const DRAIN = 0.00004;
const SIGNAL_PERIOD = 0.38;        // 转向灯周期（秒）
const BOX_ANGLE = 1.22;            // 箱盖开合约 70°
const KICKSTAND_FOLD = 1.15;

export function createSim({ scene, scooter } = {}) {
  if (scene && scooter && scene.attachScooter) scene.attachScooter(scooter);

  const rig = scooter ? scooter.rig : null;
  const signal = {
    left: { active: false, on: false, t: 0 },
    right: { active: false, on: false, t: 0 },
  };
  let lidTween = null;
  let kickTween = null;

  // ---- 箱盖开合 ----
  function tweenLid(open) {
    const lid = rig ? rig.boxLid : null;
    if (!lid) return;
    kill(lidTween);
    const from = lid.rotation.z;
    const to = open ? BOX_ANGLE : 0;
    lidTween = tween({
      duration: 0.55,
      onUpdate: (k) => { lid.rotation.z = from + (to - from) * k; },
    });
  }

  // ---- 脚撑 ----
  function tweenKickstand(fold) {
    const ks = rig ? rig.kickstand : null;
    if (!ks) return;
    kill(kickTween);
    const from = ks.rotation.x;
    const to = fold ? KICKSTAND_FOLD : 0;
    kickTween = tween({
      duration: 0.5,
      onUpdate: (k) => { ks.rotation.x = from + (to - from) * k; },
    });
  }

  on('box:toggle', () => {
    state.box.open = !state.box.open;
    tweenLid(state.box.open);
  });

  on('light:toggle', ({ which } = {}) => {
    if (which && which in state.lights) state.lights[which] = !state.lights[which];
  });

  // ---- 转向灯 ----
  function setSignalMat(side, on) {
    const mats = rig ? rig.lightMats : null;
    if (!mats) return;
    const m = side === 'left' ? mats.signalL : mats.signalR;
    if (m) m.emissiveIntensity = on ? 2.6 : 0;
  }

  function updateSignal(side, dt) {
    const s = signal[side];
    const want = !!state.lights[side];
    if (!want) {
      if (s.active) { s.active = false; s.on = false; s.t = 0; setSignalMat(side, false); }
      return;
    }
    if (!s.active) {
      s.active = true;
      s.on = true;
      s.t = 0;
      setSignalMat(side, true);
      emit('signal:tick', { side, on: true });
      return;
    }
    s.t += dt;
    while (s.t >= SIGNAL_PERIOD) {
      s.t -= SIGNAL_PERIOD;
      s.on = !s.on;
      setSignalMat(side, s.on);
      emit('signal:tick', { side, on: s.on });
    }
  }

  // ---- 灯光材质 ----
  function updateLights() {
    const mats = rig ? rig.lightMats : null;
    if (!mats) return;
    if (mats.head) mats.head.emissiveIntensity = state.lights.head ? 2.6 : 0.06;
    if (mats.tail) mats.tail.emissiveIntensity = state.lights.brake ? 2.6 : 0.5;
    if (mats.brake) mats.brake.emissiveIntensity = state.lights.brake ? 3.2 : 0;
  }

  // ---- 物理与跑单 ----
  function updateRide(dt) {
    const input = state.input;
    const ride = state.ride;

    const accel = input.throttle * ACCEL;
    const drag = DRAG_BASE + DRAG_Q * ride.speed * ride.speed;
    ride.speed = Math.min(Math.max(ride.speed + (accel - drag - input.brake * BRAKE_DECEL) * dt, 0), MAX_SPEED);

    if (input.throttle > 0 && ride.speed > 0) {
      ride.battery = Math.max(0, ride.battery - input.throttle * ride.speed * dt * DRAIN);
    }
    ride.odometer += ride.speed * dt;
    ride.orderProgress += ride.speed * dt;
    if (ride.speed > 0.01) ride.rideSeconds += dt;

    if (ride.orderProgress >= ride.orderTarget) {
      ride.orders += 1;
      ride.orderProgress -= ride.orderTarget;
      ride.orderTarget = 200 + Math.random() * 200;
      emit('order:delivered', { orders: ride.orders });
    }

    state.lights.brake = input.brake > 0.05;

    // 脚撑：按油门自动收起，停稳后放下
    if (input.throttle > 0.05 && state.kickstand) {
      state.kickstand = false;
      tweenKickstand(true);
    } else if (input.throttle <= 0.05 && ride.speed < 0.05 && !state.kickstand) {
      state.kickstand = true;
      tweenKickstand(false);
    }
  }

  // ---- 车体动画 ----
  function updateRig(dt) {
    if (!rig) return;
    const speed = state.ride.speed;
    if (rig.frontWheel) rig.frontWheel.rotation.z -= (speed / WHEEL_R) * dt;
    if (rig.rearWheel) rig.rearWheel.rotation.z -= (speed / WHEEL_R) * dt;
    if (rig.steerPivot) rig.steerPivot.rotation.y = state.input.steer * 0.35;
    if (rig.bodyLean) rig.bodyLean.rotation.x = -state.input.steer * 0.1 * Math.min(speed / 3, 1);
  }

  function update(dt) {
    updateRide(dt);
    updateRig(dt);
    updateSignal('left', dt);
    updateSignal('right', dt);
    updateLights();
  }

  return { update };
}
