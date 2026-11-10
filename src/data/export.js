// 导出海报：把车辆截图 + 今日数据画到 1080×1350 画布并触发下载
// 纯函数（只读 state，不改全局），失败时 console.warn 且不抛异常
export function exportPoster(dataUrl, state) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    console.warn('[poster] 无截图数据');
    return;
  }

  const img = new Image();
  img.onload = () => {
    try {
      const W = 1080;
      const H = 1350;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // 背景
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#141416');
      bg.addColorStop(1, '#0B0B0C');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#FBC405';
      ctx.fillRect(0, 0, W, 6);

      // 车辆截图：cover 裁切到 984×760
      const ix = 48;
      const iy = 60;
      const iw = W - 96;
      const ih = 760;
      ctx.save();
      ctx.beginPath();
      ctx.rect(ix, iy, iw, ih);
      ctx.clip();
      const ir = img.width / img.height;
      const tr = iw / ih;
      let dw;
      let dh;
      if (ir > tr) {
        dh = ih;
        dw = ih * ir;
      } else {
        dw = iw;
        dh = iw / ir;
      }
      ctx.drawImage(img, ix + (iw - dw) / 2, iy + (ih - dh) / 2, dw, dh);
      ctx.restore();
      ctx.strokeStyle = 'rgba(251,196,5,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(ix, iy, iw, ih);

      // 标题
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '700 46px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillStyle = '#EDEDED';
      ctx.fillText('THE RIDER', ix, 916);
      const w1 = ctx.measureText('THE RIDER').width;
      ctx.fillStyle = '#FBC405';
      ctx.fillText(' No. 01', ix + w1, 916);

      // 副标题
      ctx.font = '400 20px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#8A8A8A';
      ctx.fillText('一台会跑单的外卖电动车', ix, 952);

      // 分隔线
      ctx.fillStyle = 'rgba(251,196,5,0.55)';
      ctx.fillRect(ix, 1000, iw, 2);

      // 今日数据
      const ride = state?.ride || {};
      const km = (Number(ride.odometer) || 0).toFixed(1);
      const orders = Number(ride.orders) || 0;
      const secs = Math.floor(Number(ride.rideSeconds) || 0);
      const hh = Math.floor(secs / 3600);
      const mm = Math.floor((secs % 3600) / 60);
      const ss = secs % 60;
      const pad = (n) => String(n).padStart(2, '0');
      const dur = hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;

      const cols = [
        { label: '今日里程', value: `${km} km` },
        { label: '完成订单', value: `${orders} 单` },
        { label: '骑行时长', value: dur },
      ];
      const colW = iw / 3;
      ctx.textAlign = 'center';
      cols.forEach((c, i) => {
        const cx = ix + colW * i + colW / 2;
        ctx.font = '400 20px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#8A8A8A';
        ctx.fillText(c.label, cx, 1062);
        ctx.font = '600 34px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.fillStyle = '#FBC405';
        ctx.fillText(c.value, cx, 1114);
      });

      // 标语 + 底部
      ctx.font = '400 20px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#8A8A8A';
      ctx.textAlign = 'center';
      ctx.fillText('每一份外卖抵达之前，都先跑过一段路。', W / 2, 1200);
      ctx.font = '400 18px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('美团外卖 · 送啥都快', W / 2, H - 44);

      const a = document.createElement('a');
      a.download = 'rider-01.png';
      a.href = canvas.toDataURL('image/png');
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.warn('[poster] 导出失败', err);
    }
  };
  img.onerror = () => console.warn('[poster] 截图加载失败');
  img.src = dataUrl;
}
