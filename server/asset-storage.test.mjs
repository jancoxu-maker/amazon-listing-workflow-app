import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createAssetStorage } from './asset-storage.mjs';

test('filesystem asset storage persists and reads an object', async (context) => {
  const localRoot = mkdtempSync(join(tmpdir(), 'vistamz-assets-'));
  context.after(() => rmSync(localRoot, { recursive: true, force: true }));
  const storage = createAssetStorage({
    env: {},
    localRoot,
    publicBaseUrl: 'http://localhost:5174'
  });

  const stored = await storage.putObject({
    key: 'projects/project-1/generated/image.png',
    data: Buffer.from('image-data'),
    contentType: 'image/png'
  });

  assert.equal(storage.mode, 'filesystem');
  assert.equal(stored.storageKey, 'projects/project-1/generated/image.png');
  assert.equal(stored.url, 'http://localhost:5174/assets/projects/project-1/generated/image.png');
  assert.equal((await storage.getObject(stored.storageKey)).data.toString(), 'image-data');
  assert.equal((await storage.deleteObject(stored.storageKey)).deleted, true);
  await assert.rejects(storage.getObject(stored.storageKey), /Stored asset not found/);
});

test('filesystem asset storage rejects traversal keys', async () => {
  const storage = createAssetStorage({ env: {}, localRoot: join(tmpdir(), 'vistamz-assets-safe') });
  await assert.rejects(
    storage.putObject({ key: '../../outside.txt', data: Buffer.from('no') }),
    /required|Invalid/
  );
});

test('cloudinary asset storage uploads, reads and deletes an image', async () => {
  const calls = [];
  const cloudinaryClient = {
    url(publicId, options) {
      calls.push(['url', publicId, options]);
      return `https://res.cloudinary.test/${publicId}.${options.format}`;
    },
    uploader: {
      async upload(dataUrl, options) {
        calls.push(['upload', dataUrl, options]);
        return { public_id: options.public_id };
      },
      async destroy(publicId, options) {
        calls.push(['destroy', publicId, options]);
        return { result: 'ok' };
      }
    }
  };
  const storage = createAssetStorage({
    env: {
      ASSET_STORAGE_PROVIDER: 'cloudinary',
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret'
    },
    cloudinaryClient,
    fetchImpl: async () => new Response(Buffer.from('image-data'), {
      status: 200,
      headers: { 'content-type': 'image/png' }
    })
  });

  const stored = await storage.putObject({
    key: 'projects/project-1/generated/image.png',
    data: Buffer.from('image-data'),
    contentType: 'image/png'
  });

  assert.equal(storage.mode, 'cloudinary');
  assert.equal(storage.health().durable, true);
  assert.equal(stored.storageKey, 'projects/project-1/generated/image.png');
  assert.equal(calls[0][0], 'upload');
  assert.equal(calls[0][2].public_id, 'projects/project-1/generated/image');
  assert.equal(calls[0][2].type, 'authenticated');
  assert.equal((await storage.getObject(stored.storageKey)).data.toString(), 'image-data');
  assert.equal((await storage.deleteObject(stored.storageKey)).mode, 'cloudinary');
  assert.equal(calls.at(-1)[1], 'projects/project-1/generated/image');
});
