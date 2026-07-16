# Vistamz 生产对象存储配置

## 内测方案

内测阶段默认使用 Cloudinary。生成图、参考图和品牌 Logo 通过统一资产存储层保存，Postgres 只保存 `storageKey`、图片地址和项目数据，不写入 Base64 图片。

Render 环境变量：

```text
ASSET_STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=<Cloud name>
CLOUDINARY_API_KEY=<API key>
CLOUDINARY_API_SECRET=<API secret>
CLOUDINARY_DELIVERY_TYPE=authenticated
REQUIRE_DURABLE_ASSET_STORAGE=true
```

不要把真实密钥写入 `.env.local.example`、GitHub、聊天记录或截图。

## S3 兼容备选

Vistamz 仍兼容 Cloudflare R2、AWS S3、Backblaze B2 等 S3 接口。需要切换时设置：

```text
ASSET_STORAGE_PROVIDER=s3
OBJECT_STORAGE_ENDPOINT=https://<endpoint>
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=<bucket>
OBJECT_STORAGE_ACCESS_KEY_ID=<Access Key ID>
OBJECT_STORAGE_SECRET_ACCESS_KEY=<Secret Access Key>
OBJECT_STORAGE_FORCE_PATH_STYLE=false
OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS=21600
```

## 验证步骤

在配置了同一组变量的环境运行：

```bash
npm run storage:verify
```

通过标准：

- 输出 `"ok": true`。
- `mode` 为 `cloudinary` 或 `object`。
- `signedUrlCreated` 为 `true`。
- 测试文件已在结束时自动删除。
- `GET /api/health` 返回 `assetStorage.durable: true`。
- `GET /api/health` 返回 `internalBetaReadiness.ready: true`。

## 上线验收

1. 生成一张测试图片并记录项目与图槽。
2. 重启 Render API 服务。
3. 在原电脑刷新，图片仍能打开。
4. 在另一台电脑用同一账号登录，图片仍能打开。
5. 完成审核并导出 ZIP，下载内容与界面选定版本一致。

Cloudinary 默认可能禁止直接交付 ZIP。Vistamz 在 Cloudinary 模式下会由 API 即时打包，下载文件保留 30 分钟后自动清理；生成图本身仍长期保存在 Cloudinary。
