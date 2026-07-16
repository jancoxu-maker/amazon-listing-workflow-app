# Vistamz 规范化补丁

把当前 app 里“没按手册改”的地方一次性纠正到 Vistamz 设计系统。
**对运行中的 app 零影响**：在你按下面步骤应用之前，这些文件不参与构建、不改动任何现有文件——所以可以和 Codex 的改动并行存在、互不干扰。

## 什么时候应用
**等 Codex 当前这轮改动提交后**再应用（避免和它未提交的 `src/styles.css` / `src/main.jsx` 打架）。

## 三步应用
```bash
# 1) 值级批处理：字重 750/850 → 600/700；旧橙 → Vistamz 紫（会自动备份）
bash patches/normalize-vistamz.sh

# 2) 引入覆盖层（必须在 src/styles.css 之后 —— 放在 main.jsx 里 CSS import 的最后一行）
#    在 src/main.jsx 现有 import './styles.css' 之后加：
#    import '../patches/vistamz-conformance.css';

# 3) 重新构建/预览
npm run build
```

## 每个文件做什么（对照我之前的 7 条评审）
| 文件 | 修复项 |
|---|---|
| `normalize-vistamz.sh` | ③ 全局字重 750/850 → 600/700；① 旧橙 `#ff7a1a/#ff8a3d/rgba(255,138,60…)` → Vistamz 紫（强调/激活/焦点/进度语义） |
| `vistamz-conformance.css` | ② 页面标题 → Roboto Slab + 字号 32/40 + 字距 -2%；① 引导卡 `.project-center-next` → Vistamz **Coral**（正确用途）；③ 进度条/步骤 → 紫；④ `.project-open-button` → small 次级按钮(32/r9/14px/600)；⑤ 搜索框 → 42h/r12/15px |

## 语义说明（重要）
- 旧主题里橙色是“万能强调色”。Vistamz 里这些**激活/选中/焦点/进度**都归 **Purple**（primary，占比 25%）。
- **只有“引导/庆祝/高价值提示”**（如“建议从这里继续”卡）才用 **Coral**（占比 5%）——补丁 CSS 已把这张卡单独设回正确的 Coral token。
- Logo 渐变色 `#feae18 / #f85b1c` 不在替换范围内，保持不变。

## 覆盖范围
本补丁精确覆盖了**项目中心 / 新建项目**主界面的全部偏差（选择器逐一对照过 `src/styles.css`）。
其它页面若还有零星旧橙/字号问题，`normalize-vistamz.sh` 的值级替换已覆盖大部分（字重全局、旧橙全局）；个别页面专有选择器可在应用后按同样模式补进 `vistamz-conformance.css`。

## 验收
应用后对照 `tokens/…/examples/vistamz-reference.html` 或运行 `examples/vistamz-reference.html` 逐组件核对；重点看：标题是否 Roboto Slab、强调是否为紫、引导卡是否 Coral、按钮/输入尺寸是否归位。
