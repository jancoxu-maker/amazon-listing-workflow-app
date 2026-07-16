import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createAssetStorage } from './asset-storage.mjs';

function loadLocalEnv() {
  if (!existsSync('.env.local')) return;
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadLocalEnv();

const storage = createAssetStorage({
  publicBaseUrl: String(process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '')
});
const key = `system/storage-check/${Date.now()}-${randomUUID()}.txt`;
const marker = `vistamz-storage-check:${randomUUID()}`;

if (!storage.configured) {
  console.error('对象存储尚未配置：请填写 Cloudinary 或 S3 兼容对象存储的环境变量。');
  process.exitCode = 1;
} else {
  try {
    const stored = await storage.putObject({
      key,
      data: Buffer.from(marker),
      contentType: 'text/plain; charset=utf-8'
    });
    const restored = await storage.getObject(key);
    if (restored.data.toString('utf8') !== marker) {
      throw new Error('写入内容与读回内容不一致。');
    }
    const signedUrl = await storage.getUrl(key);
    console.log(JSON.stringify({
      ok: true,
      mode: stored.mode,
      storageKey: key,
      signedUrlCreated: /^https?:\/\//.test(signedUrl),
      bytesVerified: restored.data.byteLength
    }, null, 2));
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : error?.error?.message || error?.message || JSON.stringify(error);
    console.error(`对象存储验证失败：${message}`);
    process.exitCode = 1;
  } finally {
    await storage.deleteObject(key).catch(() => undefined);
  }
}
