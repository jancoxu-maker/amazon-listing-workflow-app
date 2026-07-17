# Vistamz 品牌库与品牌快照逻辑复核

日期：2026-07-16

## 结论

当前品牌库的核心方向是对的：后端已经有团队品牌库、品牌版本表和项目品牌快照，品牌规则保存时会创建新版本，项目保存时会冻结品牌规则。

但目前只是在“写入侧”基本成立，“消费侧”还没有完全闭环。规划图片方案和生成图片提示词时，仍然可能从前端品牌库、localStorage 缓存或默认品牌库读取品牌规则，而不是强制使用项目已冻结的 `brandSnapshot.rules`。

因此，除已知 P1「品牌库从 localStorage 迁移到数据库」之外，还建议补齐“生成链路只消费项目品牌快照”的约束。

## 当前逻辑概览

### 后端品牌库

文件：

- `server/brand-store.mjs`
- `db/migrations/005_brand_profiles.sql`
- `db/migrations/006_seed_default_brands.sql`

当前设计：

- `brand_profiles` 保存品牌当前状态和 `current_version`。
- `brand_profile_versions` 保存不可变品牌规则版本。
- `createBrand()` 创建品牌 v1。
- `updateBrand()` 使用事务和 `FOR UPDATE` 创建下一版本，并更新 `current_version`。
- `deleteBrand()` 只归档品牌，不删除历史版本。

判断：这一层设计正确。

### 项目品牌快照

文件：

- `api-server.mjs`
- `server/stage1-store.mjs`

关键逻辑：

- 新建项目时，`POST /api/projects` 会调用 `attachBrandSnapshot()`。
- designer/admin 更新项目时，`PATCH /api/projects/:id` 会调用 `attachBrandSnapshot(payload, currentProject.brandSnapshot)`。
- 如果品牌 id 没变，并且当前项目已有 `brandVersion`，后端会保留旧快照。
- 如果品牌 id 变了，后端会取当前品牌最新版本冻结为新快照。
- 不选品牌时保存 `{ brandId: 'none', outputPresetId }`。

判断：这符合“品牌库更新不影响旧项目”的目标。

### 前端品牌库

文件：

- `src/main.jsx`
- `src/teamApi.js`

当前前端仍保留：

- `defaultBrandLibrary`
- `BRAND_LIBRARY_STORAGE_KEY`
- `loadStoredBrands()`
- `storeBrands()`

应用启动时会先从 localStorage/default 初始化，再请求 `/api/brands` 覆盖。远程品牌加载失败或返回空时，前端可能继续使用本地缓存或默认品牌。

判断：这是已知 P1，但它不只是迁移遗留；如果进入生成链路，会造成品牌规则来源不权威。

### 项目内品牌快照注入

文件：

- `src/main.jsx`

关键逻辑：

```js
function getProjectScopedBrandLibrary(form = {}, project = {}, brands = defaultBrandLibrary) {
  const normalized = normalizeBrandLibrary(brands);
  const selectedBrandId = getProjectBrandId(form, normalized);
  const snapshot = project?.brandSnapshot;
  if (
    !snapshot?.rules
    || snapshot.brandId !== selectedBrandId
    || selectedBrandId === 'none'
  ) return normalized;

  const frozenBrand = normalizeBrandProfile({
    ...snapshot.rules,
    id: snapshot.brandId,
    name: snapshot.brandName || snapshot.rules.name,
    version: snapshot.brandVersion
  });
  return normalizeBrandLibrary([
    ...normalized.filter((brand) => brand.id !== selectedBrandId),
    frozenBrand
  ]);
}
```

判断：这个设计是在前端尽量让当前项目使用冻结快照，方向正确。但它仍是前端约束，不是服务端强约束。

## 风险分级

### P0

当前没有确认到现成 P0。

复核过程中重点检查过“operator 是否可能把完整品牌快照覆盖成 stub”。当前 `stage1-store.mjs` 的 operator 更新分支会保留数据库里的 `current.brand_snapshot`，不会写入前端传来的简化 `brandSnapshot`，所以这个风险在当前代码里不成立。

不过，如果未来新增项目写入接口或绕过 `attachBrandSnapshot()`，需要继续防止客户端传入的简化快照覆盖完整快照。

### P1

#### 1. 生成/规划消费侧没有强制读取项目快照

当前 `/api/plan-storyboard` 接收前端传来的 `brandProfile`，服务端没有按 `projectId` 读取数据库里的 `brand_snapshot.rules` 并校验。

生图提示词也主要在前端通过：

```js
const brand = getBrandProfile(brief.brandId, options.brandLibrary || defaultBrandLibrary);
```

读取品牌规则。

风险：

- 调用点漏传 `brandLibrary` 时，会回落到 `defaultBrandLibrary`。
- 远程品牌库加载失败时，可能使用 localStorage 或默认品牌继续生成。
- 项目快照存在，但生成链路没有服务端硬性保证一定使用它。

建议：

- 规划和生图都应以项目 `brandSnapshot.rules` 为唯一品牌规则来源。
- 服务端根据 `projectId` 读取项目快照，前端只传项目和图槽信息。
- 如果短期不能把 prompt 构建搬到服务端，至少前端必须显式从 `currentProject.brandSnapshot.rules` 构造品牌规则，缺失时阻止生成。

#### 2. localStorage/default 品牌库仍可能进入生产路径

当前 localStorage/default 品牌库仍可作为前端初始化数据。远程品牌库加载失败时，不会明确阻止品牌选择和生成。

风险：

- 团队品牌库不是唯一权威来源。
- 旧浏览器缓存可能带来已归档或旧版本品牌。
- 默认 `cosyland/overmont` 可能在真实团队数据缺失时被误用。

建议：

- localStorage 最多作为只读展示缓存。
- 远程品牌库加载失败时，明确提示并禁用品牌选择与品牌模式生成。
- 生成链路不允许从 localStorage/default 品牌库取规则。

#### 3. 缺少显式“升级项目品牌快照”入口

当前同品牌 id 更新项目时，后端会保留旧快照。这是正确行为。

但如果品牌库从 v3 更新到 v5，项目仍锁定 v3，UI 没有明确提示，也没有“升级到最新版品牌规则”的动作。

建议：

- UI 显示“项目锁定品牌 v3，品牌库当前 v5”。
- 提供显式“升级项目品牌快照”操作。
- 升级后应清空或标记旧方案/旧候选图，因为它们基于旧品牌版本生成。

#### 4. 归档品牌与本地缓存行为需要明确

后端 `listBrands()` 只返回 active 品牌，旧项目快照仍可继续使用归档品牌规则，这是正确的。

风险来自前端 localStorage：如果本地缓存里还有已归档品牌，新项目可能仍能选择它，保存时再失败。

建议：

- 新项目品牌选择只显示远程 active 品牌。
- 已归档品牌只允许通过旧项目快照继续消费。
- 保存新项目时，后端继续拒绝不存在或已归档品牌。

#### 5. A+ 输出类型保存判断有 bug

文件：

- `src/main.jsx`

当前逻辑：

```js
outputType: getProjectPlanOutputPresetId(form) === 'a-plus' ? 'a-plus' : 'main-image'
```

但 `getProjectPlanOutputPresetId()` 返回的是：

```js
return form.planOutputPresetId === 'aplus' || form.planOutputPresetId === 'a-plus' ? 'aplus' : 'main-image';
```

因此 A+ 项目保存到后端时，`outputType` 会被误判为 `main-image`。

建议修为：

```js
outputType: getProjectPlanOutputPresetId(form) === 'aplus' ? 'a-plus' : 'main-image'
```

这不是纯品牌库问题，但会影响项目输出类型、品牌快照里的 `outputPresetId` 以及后续规划一致性，建议和品牌库修复一起处理。

### P2

#### 1. 生成记录缺少稳定 brandVersion

当前方案 brief 主要记录 `brandId` 和 `brandName`，日志中部分位置有 `brandVersion`，但生成 run/prompt 里没有稳定保存品牌版本。

建议：

- storyboard brief 保存 `brandVersion`。
- generation run 保存 `brandId`、`brandVersion`、`brandName`。
- AI review 和导出记录也带上品牌版本，方便追溯。

#### 2. 品牌规则 schema 仍比较松散

当前 `mapBrand()` 会把 `rules` 打平，再覆盖 `id/name/version`。

短期可用，但长期建议把元数据和规则分开：

```js
{
  id,
  name,
  version,
  updatedAt,
  rules: {
    tone,
    colors,
    titleColor,
    arrowStyle,
    ...
  }
}
```

这样可以避免规则字段与元数据字段相互覆盖。

#### 3. useMemo 依赖可以更严谨

`projectBrandLibrary` 的依赖目前主要是：

```js
[brandLibrary, currentProject?.brandSnapshot, projectForm.brandId]
```

如果后续继续支持 `selectedBrandId` 或更多品牌选择字段，应补齐依赖，避免返回旧 scoped library。

## 最小修改建议

按优先级建议如下：

1. 修复 A+ 输出类型保存判断。
2. 禁止生成链路从 `defaultBrandLibrary` 静默兜底，缺少品牌快照时应阻止生成并提示。
3. 让规划和生图使用项目 `brandSnapshot.rules`，不要信任客户端传来的 live brandProfile。
4. 完成品牌库 P1：localStorage 不再作为可生成的数据源，远程品牌库失败时禁用品牌模式。
5. 增加项目品牌版本提示和“升级品牌快照”入口。
6. 给 storyboard brief、generation run、review/export 记录补 `brandVersion`。

## 推荐目标状态

最终品牌库逻辑应收敛为：

1. 团队品牌库在数据库中维护。
2. 品牌每次保存创建不可变版本。
3. 项目选择品牌时冻结完整版本快照。
4. 后续品牌更新不影响旧项目。
5. 生成方案、生图、预审、导出都只读取项目冻结快照。
6. 如果用户要使用新品牌版本，必须显式升级项目快照。
7. localStorage 只能用于非权威缓存，不能进入生产生成链路。

