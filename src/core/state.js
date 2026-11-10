export const state = {
  input:  { throttle: 0, brake: 0, steer: 0 },
  ride:   { speed: 0, battery: 1, odometer: 0,
            orderTarget: 300, orderProgress: 0, orders: 0, rideSeconds: 0 },
  lights: { head: false, brake: false, left: false, right: false },
  box:    { open: false },
  kickstand: true,
  view: 'ride',
  explode: 0,
  cutaway: false,
  xray: false,
  tour:  { active: false, step: 0, auto: false },
  focusPart: null,
  audio: { unlocked: false, muted: false },
};

export function resetToday() {
  state.ride.orders = 0;
  state.ride.rideSeconds = 0;
  state.ride.orderProgress = 0;
  state.ride.orderTarget = 300;
}

export function clearAll() {
  resetToday();
  state.ride.odometer = 0;
  state.ride.battery = 1;
  state.ride.speed = 0;
  state.box.open = false;
  state.lights.head = false;
  state.lights.left = false;
  state.lights.right = false;
  state.lights.brake = false;
}
