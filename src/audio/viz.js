// 声音视角可视化：时域波形 + 频谱柱。
// 只读 getAnalyser()，未解锁（返回 null）时画静态平线 / 低幅噪点，不报错。
// 每帧由 main.js 主循环调用 update(dt)；canvas 尺寸变化自适应（含 DPR）。
import { getAnalyser } from './engine.js';

const ACCENT = '251,196,5'; // 美团黄 #FBC405 的 RGB 分量，便于调透明度

// 固定种子的伪随机，用于未解锁时的静态噪点（不随时间闪动）
function makeIdle(n) {
  const arr = new Float32Array(n);
  let s = 22222;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    arr[i] = (s / 4294967296) * 2 - 1;
  }
  return arr;
}

export function createSoundViz(canvas) {
  const g = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (!g) return { update() {} };

  const PAD = 12;
  const idleWave = makeIdle(1024);
  const idleBars = makeIdle(96);

  let cssW = 0;
  let cssH = 0;
  let dpr = 1;

  let waveBuf = null;  // Uint8Array(analyser.fftSize)
  let freqBuf = null;  // Uint8Array(analyser.frequencyBinCount)
  let smooth = null;   // Float32Array 频柱平滑值（快攻慢放）
  let waveGain = 1;    // 波形自动增益（峰值偏小才放大，静音不放大）

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === cssW && h === cssH) return;
    cssW = w;
    cssH = h;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(w * dpr));
    const H = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
  }

  function line(x0, y0, x1, y1) {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }

  function drawWave(analyser, midY, dt) {
    const x0 = PAD;
    const x1 = cssW - PAD;
    const top = 12;
    const bot = midY - 6;
    const cy = (top + bot) / 2;
    const amp = (bot - top) / 2;
    const n = Math.max(1, Math.floor(x1 - x0));

    // 中线
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.lineWidth = 1;
    line(x0, cy, x1, cy);

    g.beginPath();
    if (!analyser) {
      // 未解锁：静态低幅噪点
      for (let i = 0; i <= n; i++) {
        const y = cy + idleWave[i % idleWave.length] * 0.06 * amp;
        if (i === 0) g.moveTo(x0 + i, y); else g.lineTo(x0 + i, y);
      }
      g.strokeStyle = `rgba(${ACCENT},0.35)`;
      g.lineWidth = 1;
      g.stroke();
      return;
    }

    if (!waveBuf || waveBuf.length !== analyser.fftSize) {
      waveBuf = new Uint8Array(analyser.fftSize);
    }
    analyser.getByteTimeDomainData(waveBuf);
    const step = waveBuf.length / n;
    const last = waveBuf.length - 1;

    // 峰值偏移太小时温和放大（上限 12 倍），静音/近静音不放大
    let peak = 0;
    for (let i = 0; i < waveBuf.length; i++) {
      const d = Math.abs(waveBuf[i] - 128);
      if (d > peak) peak = d;
    }
    const target = peak > 2 ? Math.min(12, (0.72 * 128) / peak) : 1;
    const kg = target < waveGain ? 1 - Math.exp(-dt * 10) : 1 - Math.exp(-dt * 2.5);
    waveGain += (target - waveGain) * kg;

    for (let i = 0; i <= n; i++) {
      const v = ((waveBuf[Math.min(last, Math.floor(i * step))] - 128) / 128) * waveGain;
      const y = cy + v * amp * 0.92;
      if (i === 0) g.moveTo(x0 + i, y); else g.lineTo(x0 + i, y);
    }
    // 先描边，再向下闭合填充（填充半透明，不会盖住描边）
    g.strokeStyle = `rgba(${ACCENT},0.9)`;
    g.lineWidth = 1.5;
    g.stroke();
    g.lineTo(x1, cy);
    g.lineTo(x0, cy);
    g.closePath();
    g.fillStyle = `rgba(${ACCENT},0.10)`;
    g.fill();
  }

  function drawSpectrum(analyser, midY, dt) {
    const x0 = PAD;
    const x1 = cssW - PAD;
    const yb = cssH - 12;
    const ytop = midY + 10;
    const maxH = Math.max(8, yb - ytop);

    // 基线
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.lineWidth = 1;
    line(x0, yb + 0.5, x1, yb + 0.5);

    const count = Math.max(24, Math.min(72, Math.floor((x1 - x0) / 9)));
    if (!smooth || smooth.length !== count) {
      smooth = new Float32Array(count);
    }
    const gap = 2;
    const bw = (x1 - x0) / count - gap;

    let vals = null;
    if (analyser) {
      if (!freqBuf || freqBuf.length !== analyser.frequencyBinCount) {
        freqBuf = new Uint8Array(analyser.frequencyBinCount);
      }
      analyser.getByteFrequencyData(freqBuf);
      vals = new Float32Array(count);

      // 对数分箱：40Hz ~ min(10kHz, 奈奎斯特)，只取低频到中频，避免密成一团
      const sr = (analyser.context && analyser.context.sampleRate) || 48000;
      const nyq = sr / 2;
      const bins = analyser.frequencyBinCount;
      const fMin = 40;
      const fMax = Math.min(10000, nyq);
      const ratio = fMax / fMin;
      for (let i = 0; i < count; i++) {
        const f0 = fMin * Math.pow(ratio, i / count);
        const f1 = fMin * Math.pow(ratio, (i + 1) / count);
        let b0 = Math.floor((f0 / nyq) * bins);
        let b1 = Math.max(b0 + 1, Math.ceil((f1 / nyq) * bins));
        b0 = Math.min(b0, bins - 1);
        b1 = Math.min(b1, bins);
        let m = 0;
        for (let b = b0; b < b1; b++) if (freqBuf[b] > m) m = freqBuf[b];
        vals[i] = m / 255;
      }
    }

    for (let i = 0; i < count; i++) {
      // 未解锁：静态低幅柱
      const target = vals ? vals[i] : (idleBars[i % idleBars.length] * 0.5 + 0.5) * 0.06;
      const k = target > smooth[i]
        ? 1 - Math.exp(-dt * 18)   // 快攻
        : 1 - Math.exp(-dt * 5);   // 慢放
      smooth[i] += (target - smooth[i]) * k;

      const h = Math.max(1.5, smooth[i] * maxH);
      const x = x0 + i * (bw + gap);
      g.fillStyle = `rgba(${ACCENT},0.22)`;
      g.fillRect(x, yb - h, bw, h);
      g.fillStyle = `rgba(${ACCENT},0.85)`;
      g.fillRect(x, yb - h, bw, 1.5);
    }
  }

  function drawLabels(analyser, midY) {
    g.font = '9px ui-monospace, Menlo, Consolas, monospace';
    g.textBaseline = 'top';
    g.textAlign = 'left';
    g.fillStyle = `rgba(${ACCENT},0.5)`;
    g.fillText('WAVE', PAD, 2);
    g.fillStyle = 'rgba(138,138,138,0.75)';
    g.fillText('SPECTRUM', PAD, midY + 2);
    g.textAlign = 'right';
    g.fillStyle = analyser ? `rgba(${ACCENT},0.75)` : 'rgba(138,138,138,0.6)';
    g.fillText(analyser ? 'LIVE' : 'STANDBY', cssW - PAD, 2);
    g.textAlign = 'left';
  }

  function update(dt) {
    const d = dt || 0;
    resize();
    // 隐藏（display:none）时 clientWidth/Height 为 0，直接跳过
    if (!cssW || !cssH) return;

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cssW, cssH);

    const analyser = getAnalyser();
    const midY = cssH * 0.46;

    g.strokeStyle = 'rgba(255,255,255,0.07)';
    g.lineWidth = 1;
    line(PAD * 0.5, midY, cssW - PAD * 0.5, midY);

    drawWave(analyser, midY, d);
    drawSpectrum(analyser, midY, d);
    drawLabels(analyser, midY);
  }

  return { update };
}
