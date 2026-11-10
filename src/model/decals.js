// 贴花：黑色椭圆底 + 黄色袋鼠剪影 + 美团外卖 / 送啥都快
// 官方图 assets/logo-kangaroo.png 不存在，用代码画简化剪影
import * as THREE from 'three';

const FONT_STACK = `'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif`;
const YELLOW = '#FBC405';

// 简化袋鼠剪影：大头长耳、前肢、大后腿、粗尾巴
function drawKangaroo(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';

  // 尾巴（粗曲线拖到地面）
  ctx.lineWidth = 0.17;
  ctx.beginPath();
  ctx.moveTo(0.05, 0.20);
  ctx.quadraticCurveTo(-0.32, 0.28, -0.46, 0.62);
  ctx.stroke();

  // 身体
  ctx.beginPath();
  ctx.ellipse(0.02, 0.06, 0.27, 0.30, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // 后腿（大）
  ctx.beginPath();
  ctx.ellipse(-0.10, 0.30, 0.20, 0.13, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // 脚
  ctx.beginPath();
  ctx.ellipse(-0.30, 0.38, 0.15, 0.055, 0.02, 0, Math.PI * 2);
  ctx.fill();

  // 前肢（小）
  ctx.beginPath();
  ctx.ellipse(0.26, 0.14, 0.055, 0.13, 0.45, 0, Math.PI * 2);
  ctx.fill();

  // 头
  ctx.beginPath();
  ctx.ellipse(0.28, -0.26, 0.145, 0.115, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // 吻部
  ctx.beginPath();
  ctx.ellipse(0.38, -0.22, 0.07, 0.05, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 耳朵（两只长耳）
  ctx.beginPath();
  ctx.ellipse(0.30, -0.47, 0.048, 0.15, 0.30, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0.19, -0.48, 0.042, 0.13, 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function paintSideDecal(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  // 黑色椭圆底
  ctx.fillStyle = '#0E0E10';
  ctx.beginPath();
  ctx.ellipse(W / 2, H / 2, W * 0.485, H * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  drawKangaroo(ctx, W * 0.24, H * 0.50, H * 0.42, YELLOW);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(H * 0.26)}px ${FONT_STACK}`;
  ctx.fillText('美团外卖', W * 0.63, H * 0.38);
  ctx.fillStyle = YELLOW;
  ctx.font = `bold ${Math.round(H * 0.145)}px ${FONT_STACK}`;
  ctx.fillText('送啥都快', W * 0.63, H * 0.68);
}

function paintBoxDecal(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  drawKangaroo(ctx, W * 0.5, H * 0.33, H * 0.44, YELLOW);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(H * 0.19)}px ${FONT_STACK}`;
  ctx.fillText('美团外卖', W * 0.5, H * 0.70);
  ctx.fillStyle = YELLOW;
  ctx.font = `bold ${Math.round(H * 0.105)}px ${FONT_STACK}`;
  ctx.fillText('送啥都快', W * 0.5, H * 0.85);
}

function makeTexture(painter, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  painter(ctx, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  // 字体就绪后重绘一次，保证中文字形正确
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      painter(ctx, w, h);
      tex.needsUpdate = true;
    });
  }
  return tex;
}

export function createSideDecalTexture() {
  return makeTexture(paintSideDecal, 512, 320);
}

export function createBoxDecalTexture() {
  return makeTexture(paintBoxDecal, 512, 512);
}

