# 建模 Agent 交接（美团外卖电动车）

## 改动文件（全部在 src/model/ 内）
- `src/model/index.js` — 整车装配：root / bodyLean / steerPivot 三层；18 个零件注册；parts 数组（`labelAnchor` 取包围盒顶中心、`explodeDir`/`explodeDist` 取自 config）；rig；shellMaterials。保留两个默认不生效的调试钩子 `?spin=`、`?stats=`。
- `src/model/materials.js` — 全车共享材质；`head` 灯玻璃颜色由 `0xFFF6DC` 改为 `0xE2E6EA`（旧值在 ACES 下白成一团）。
- `src/model/util.js` — 几何工具（rbox / put / extrudeSide / tube / annularSector）；贴花拆成 `decalMaterial` + `decalMesh`；新增 `capsuleSurfaceZ` + `bulgeDecalMesh`（顶点沿胶囊鼓包表面位移的贴合贴花）。
- `src/model/decals.js` — CanvasTexture 贴花：黑椭圆底 + 黄色袋鼠剪影 + 美团外卖 + 送啥都快；`document.fonts.ready` 后重绘；SRGBColorSpace、anisotropy 8。
- `src/model/parts/body.js` — 前护板 / 脚踏板 / 侧裙（后轮轮拱轮廓 + 胶囊鼓包 + 贴合贴花 + 镀铬底边）/ 前挡泥板 / 座垫。
- `src/model/parts/cockpit.js` — 车把（圆形大灯、握把、开关座、仪表盖、前转向灯、后视镜）、前叉。
- `src/model/parts/rear.js` — 后货架（镀铬弯管 + 托板）、外卖箱（箱体 + 独立箱盖 + 黄色描边 + 三向贴花）、尾灯与牌照。
- `src/model/parts/internals.js` — 车架、电池组（InstancedMesh 电芯）、控制器、线束、脚撑。
- `src/model/parts/wheels.js` — 车轮（轮胎 + 银色轮毂盖 + 5 辐）、后轮毂电机（InstancedMesh 线圈）。

## 导出接口
`buildScooter()` 返回 `{ root, parts, rig, shellMaterials }`，与任务契约一致。
零件 id / nameZh / desc / layer / internal 全部来自 `core/config.js` 的 `PARTS`（18 个，未重写）。
`rig`：frontWheel / rearWheel / steerPivot / bodyLean / boxLid / kickstand /
lightMats{head,tail,brake,signalL,signalR} / headSpot / harnessPath。

## 自测结果
- 三角面数：**59694**，mesh 数 143（远低于 300k）。
- `?solo=model` 与主页均打印 `[rider01] ready`，无 JS 报错（仅 Chrome 自身的 CVDisplayLink / ReadPixels 性能提示）。
- 截图（dev 预览页 `src/model/_preview.html`：普通 WebGLRenderer，不带 EffectComposer/阴影，规避共享机器上 swiftshader 全场景截图超时）：
  - 侧视 `/tmp/prev_side2.png` — 对照 reference.png：黄色烤漆车身、黑座垫、黑箱黄边、侧裙鼓包贴花、镀铬货架、圆大灯、银色轮毂均在。
  - 后 3/4 `/tmp/prev_rear.png` — 尾灯/牌照已贴回车身尾面，不再悬空。
  - 前 3/4 `/tmp/prev_front.png`。
  - 默认 3/4 `/tmp/prev_default.png` — 与主相机 (-3.2, 1.6, 1.6) 同视角。
- 灰模（全场景实拍，当时机器负载低）：`/tmp/model_grey_0.png`（后 3/4）、`/tmp/model_grey_150.png`（侧视）——方块/圆柱拼出的比例骨架。
- 灰模 → 精模对比结论：骨架比例（轴距 1.24、轮径 0.40、座高 0.80、箱底 0.86）在精模中全部保留；精模把方块换成了侧视轮廓挤出（前护板 / 脚踏板 / 带轮拱的侧裙）、胶囊鼓包、镀铬弯管货架、球形灯玻璃与贴花、InstancedMesh 电芯/线圈，并补上前叉、后视镜、座垫扶手等细节。
- 与参考图对比结论：整体比例、配色、部件位置接近；侧裙鼓包 + 黑椭圆袋鼠标识、外卖箱黄色描边、后货架、座垫、圆大灯均对应。

## 已知问题
- 前叉与前轮被前护板完全遮住（与参考图一致，非缺陷）。
- 前轮胎上后象限与前护板下部存在隐藏重叠（轮胎没入护板内部，外观不可见；真车也是同样的封装关系）。
- 后视镜为简化球壳，未做镜面反射。
- 袋鼠标识为代码绘制剪影，形似度一般；按任务要求保留剪影 + 文字。
- 全场景（EffectComposer + PCFSoftShadow）在共享机器 swiftshader 下截图耗时极长（多次尝试均 >5 分钟未出图，shader 编译 + 逐帧渲染被 CPU 负载拖死），本轮视觉自测主要用 dev 预览页截图；`?solo=model` 与主页的「零报错」改用 console 日志校验。
- `src/model/_preview.html` 为自测用 dev 文件，提交前已删除；如下一轮还需要快速截图，可重建该页（普通 WebGLRenderer，不带 composer/阴影）。

## 阶段3 第1轮：视觉验收问题修复（V1 / V3 / V4 / V6）

改动文件：`src/model/parts/body.js`、`src/model/parts/internals.js`、`src/model/parts/cockpit.js`、`src/model/materials.js`

- **V1（P1）后轮与轮毂盖被鼓包遮挡**：`BULGE` 半径 0.26→0.17、zScale 0.45→0.62，`BULGE_POS` 由 (x -0.52, y 0.42, z 0.165) 改为 (x -0.52, y 0.47, z 0.18)；侧裙轮廓下缘由 y=0.19 抬到 **y=0.30**（与 SPEC §2 侧裙 y 0.30–0.70 对齐），轮拱改为上半圆（`absarc(-0.62, 0.20, 0.24, 0.43, Math.PI-0.43)`），下缘不再封死，后轮下半部与银色轮毂盖露出。底边镀铬饰条相应拆成两段避让轮拱开口。
- **V3（P2）前挡泥板过大下探**：`annularSector(0.215, 0.278, -0.38, Math.PI+0.38)` → `annularSector(0.212, 0.244, 0.22, Math.PI-0.22)`，径向更薄、包角更小，贴合前轮上半部。
- **V4（P2）控制器裸露在脚踏板下方**：`buildController` 位置 (0.05, 0.175, 0) → **(-0.32, 0.55, 0)**，移到电池上方、座垫下方的内腔，由侧裙遮挡。线束路径相应上移（HARNESS_POINTS 整体抬高并绕开控制器新位置），删掉原来到车把的分支（该分支已无必要且穿过脚踏）。
- **V6（P2）大灯关灯时仍发白**：灯碗材质 color 0xE2E6EA→0x7E858B、roughness 0.2→0.55；`cockpit.js` 透镜位置 0.058→0.044 内凹进灯碗，靠灯碗遮光。
- 顺带：车架主梁前段压低（0.49,0.42 → 0.49,0.40 起，经过 0.38,0.265），不再有一截横管露在脚踏板上方。

### 自测结果
- `?view=inspect&spin=90`（正侧）：后轮与银色轮毂盖完整可见，侧裙下缘与轮拱关系干净；前挡泥板贴合前轮，不再像雪橇。
- `?view=inspect`（前 3/4）：前大灯关灯状态不再是一颗白球。
- 三个视角均 `errs=0`（无 JS 报错）。
- 拆解 100%：脚踏板与轮毂电机不再沉到地面以下（配合主 Agent 的 `config.js` 拆解方向修改）。
