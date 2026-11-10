// 尺寸表、配色、零件ID表 —— 唯一数据源，禁止在其它文件里写魔法数
import * as THREE from 'three';

export const PAINT = 0xFBC405;
export const GLOSS_BLACK = 0x111111;
export const SEAT = 0x1A1A1A;
export const CHROME = 0xDDDDDD;
export const HUB = 0xC8CCD0;
export const TIRE = 0x1B1B1B;
export const BATTERY_SHELL = 0x2B2F36;
export const CELL = 0x2FB5A5;
export const COIL = 0xB87333;

export const UI = {
  bg: '#0B0B0C',
  panel: 'rgba(20,20,22,0.72)',
  accent: '#FBC405',
  text: '#EDEDED',
  dim: '#8A8A8A',
};

export const DIM = {
  wheelbase: 1.24,
  frontAxleX: 0.62,
  rearAxleX: -0.62,
  wheelRadius: 0.20,
  tireWidth: 0.09,
  hubRadius: 0.12,
  bodyLength: 1.80,
  bodyMinX: -0.95,
  bodyMaxX: 0.85,
  legShieldTop: 1.00,
  legShieldWidth: 0.42,
  legShieldX: 0.48,
  floorY: 0.28,
  floorMinX: -0.05,
  floorMaxX: 0.45,
  floorWidth: 0.34,
  cowlX: -0.45,
  cowlY: 0.50,
  cowlLength: 0.75,
  cowlHeight: 0.40,
  cowlWidth: 0.56,
  seatTop: 0.80,
  seatMinX: -0.70,
  seatMaxX: -0.05,
  seatWidth: 0.30,
  handleY: 1.10,
  handleWidth: 0.68,
  handleX: 0.52,
  rackY: 0.82,
  rackMinX: -0.95,
  rackMaxX: -0.55,
  boxLength: 0.46,
  boxWidth: 0.44,
  boxHeight: 0.40,
  boxBottomY: 0.86,
  boxX: -0.75,
  tailX: -0.95,
  tailY: 0.60,
};

export const MAX_SPEED = 6.94; // m/s = 25 km/h 新国标

// layer 越大越外层、拆解时越先移动
export const PARTS = [
  { id: 'frame',       nameZh: '车架',         layer: 0, internal: true,
    desc: '整车的骨架，把所有零件连在一起，决定车身的刚性和骑行手感。' },
  { id: 'battery',     nameZh: '电池组',       layer: 1, internal: true,
    desc: '多节锂电芯串并联组成，藏在脚踏板和座垫下方，决定续航。' },
  { id: 'controller',  nameZh: '控制器',       layer: 1, internal: true,
    desc: '把拧把信号换算成电流，决定电机出多少力，刹车时切断动力。' },
  { id: 'harness',     nameZh: '线束',         layer: 1, internal: true,
    desc: '连接电池、控制器和电机的电缆，传输驱动电流和信号。' },
  { id: 'hubMotor',    nameZh: '后轮毂电机',   layer: 2, internal: true,
    desc: '电机直接装在后轮里，没有链条，安静、少维护。' },
  { id: 'legShield',   nameZh: '前护板',       layer: 3, internal: false,
    desc: '竖直的弧形板，挡风挡泥，保护骑手腿部。' },
  { id: 'floorboard',  nameZh: '脚踏板',       layer: 3, internal: false,
    desc: '低平防滑，方便骑手上下车和放置双脚。' },
  { id: 'sideCowlL',   nameZh: '左侧裙',       layer: 3, internal: false,
    desc: '后部饱满的鼓包造型，遮盖车架和电池，两侧贴有美团外卖贴花。' },
  { id: 'sideCowlR',   nameZh: '右侧裙',       layer: 3, internal: false,
    desc: '后部饱满的鼓包造型，遮盖车架和电池，两侧贴有美团外卖贴花。' },
  { id: 'frontFender', nameZh: '前挡泥板',     layer: 3, internal: false,
    desc: '黄色弧形板，包住前轮上半部，防止泥水甩到骑手身上。' },
  { id: 'seat',        nameZh: '座垫',         layer: 4, internal: false,
    desc: '黑色长条座垫，覆盖在后部侧裙上方，长时间骑行不累。' },
  { id: 'handlebar',   nameZh: '车把与大灯',   layer: 4, internal: false,
    desc: '黑色车把两端握把，中央圆形大灯提供夜间照明。' },
  { id: 'frontFork',   nameZh: '前叉',         layer: 4, internal: false,
    desc: '连接车把和前轮，内含减震弹簧，过滤路面颠簸。' },
  { id: 'frontWheel',  nameZh: '前轮',         layer: 4, internal: false,
    desc: '小轮径黑色轮胎配银色轮毂盖，负责转向。' },
  { id: 'rearWheel',   nameZh: '后轮',         layer: 4, internal: false,
    desc: '小轮径黑色轮胎配银色轮毂盖，轮毂内藏驱动电机。' },
  { id: 'rearRack',    nameZh: '后货架',       layer: 4, internal: false,
    desc: '镀铬弯管货架，用来固定外卖箱。' },
  { id: 'deliveryBox', nameZh: '外卖箱',       layer: 4, internal: false,
    desc: '固定在后货架上，保温层让餐品在路上保持温度，箱盖可开合。' },
  { id: 'tailLight',   nameZh: '尾灯与牌照',   layer: 4, internal: false,
    desc: '车尾刹车灯和牌照板，刹车时尾灯变亮提醒后方。' },
];

export const PART_MAP = Object.fromEntries(PARTS.map((p) => [p.id, p]));

// 拆解方向（手动指定的覆盖默认值）
export const EXPLODE_DIR = {
  deliveryBox: new THREE.Vector3(0, 1, 0),
  seat:        new THREE.Vector3(0, 1, 0),
  // 前轮向前方滚出并抬离地面，后轮向后上方退出，避免拆解时贴在地面上
  frontWheel:  new THREE.Vector3(0.95, 0.31, 0).normalize(),
  rearWheel:   new THREE.Vector3(-0.95, 0.31, 0).normalize(),
  // 轮毂电机沿轴向（+Z 车身左侧）从轮里抽出；原自动方向会把它压到地面以下
  hubMotor:    new THREE.Vector3(-0.25, 0, 0.97).normalize(),
  // 脚踏板原自动方向朝正下方，会沉到地面以下，改为向前下方并偏向左侧
  floorboard:  new THREE.Vector3(0.65, -0.4, 0.35).normalize(),
  sideCowlL:   new THREE.Vector3(0, 0, 1),
  sideCowlR:   new THREE.Vector3(0, 0, -1),
  battery:     new THREE.Vector3(0, -0.6, 0.8).normalize(),
  legShield:   new THREE.Vector3(0.7, 0.2, 0).normalize(),
  handlebar:   new THREE.Vector3(0.4, 0.9, 0).normalize(),
  frontFender: new THREE.Vector3(0.8, 0.4, 0).normalize(),
};

export const EXPLODE_DIST = {
  deliveryBox: 0.55, seat: 0.5, frontWheel: 0.95, rearWheel: 0.45,
  sideCowlL: 0.5, sideCowlR: 0.5, legShield: 0.42, frontFender: 0.42,
  handlebar: 0.42, rearRack: 0.42, tailLight: 0.42, battery: 0.4,
  hubMotor: 0.42, controller: 0.32, harness: 0.3, floorboard: 0.36,
  frame: 0.15,
};

export const TOUR_STEPS = [
  { part: 'legShield',  name: '车身',
    desc: '复古踏板造型，前护板挡风挡泥，低平脚踏板方便骑手上下车。' },
  { part: 'battery',    name: '电池组',
    desc: '多节锂电芯串并联组成，藏在脚踏板和座垫下方，决定续航。' },
  { part: 'hubMotor',   name: '轮毂电机',
    desc: '电机直接装在后轮里，没有链条，安静、少维护。' },
  { part: 'controller', name: '控制器',
    desc: '把拧把信号换算成电流，决定电机出多少力，刹车时切断动力。' },
  { part: 'deliveryBox',name: '外卖箱',
    desc: '固定在后货架上，保温层让餐品在路上保持温度，箱盖可开合。' },
];
