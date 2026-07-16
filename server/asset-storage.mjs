import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v2 as cloudinarySdk } from 'cloudinary';

function normalizeStorageKey(value = '') {
  const normalized = String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  const parts = normalized.split('/');
  if (parts.includes('..')) throw new Error('Invalid asset storage key');
  const key = parts
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/');
  if (!key) throw new Error('Asset storage key is required');
  return key;
}

function encodeStorageKey(key) {
  return normalizeStorageKey(key).split('/').map(encodeURIComponent).join('/');
}

function bodyToBuffer(body) {
  if (!body) return Promise.resolve(Buffer.alloc(0));
  if (typeof body.transformToByteArray === 'function') {
    return body.transformToByteArray().then((bytes) => Buffer.from(bytes));
  }
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    body.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    body.on('error', reject);
    body.on('end', () => resolveBody(Buffer.concat(chunks)));
  });
}

const CLOUDINARY_IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);

function getCloudinaryDescriptor(rawKey, contentType = '') {
  const key = normalizeStorageKey(rawKey);
  const extension = extname(key).toLowerCase();
  const isImage = String(contentType).toLowerCase().startsWith('image/') || CLOUDINARY_IMAGE_EXTENSIONS.has(extension);
  if (!isImage) return { key, publicId: key, resourceType: 'raw', format: '' };
  return {
    key,
    publicId: extension ? key.slice(0, -extension.length) : key,
    resourceType: 'image',
    format: extension === '.jpg' ? 'jpg' : extension.replace(/^\./, '')
  };
}

export function createAssetStorage(options = {}) {
  const env = options.env || process.env;
  const provider = String(env.ASSET_STORAGE_PROVIDER || 'auto').trim().toLowerCase();
  const publicBaseUrl = String(options.publicBaseUrl || '').replace(/\/$/, '');
  const localRoot = resolve(options.localRoot || env.ASSET_STORAGE_DIR || 'data/assets');
  const bucket = String(env.OBJECT_STORAGE_BUCKET || '').trim();
  const endpoint = String(env.OBJECT_STORAGE_ENDPOINT || '').trim();
  const region = String(env.OBJECT_STORAGE_REGION || 'auto').trim();
  const accessKeyId = String(env.OBJECT_STORAGE_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(env.OBJECT_STORAGE_SECRET_ACCESS_KEY || '').trim();
  const signedUrlTtlSeconds = Math.max(60, Number(env.OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS || 21600));
  const s3Configured = Boolean(bucket && endpoint && accessKeyId && secretAccessKey);
  const cloudinaryCloudName = String(env.CLOUDINARY_CLOUD_NAME || '').trim();
  const cloudinaryApiKey = String(env.CLOUDINARY_API_KEY || '').trim();
  const cloudinaryApiSecret = String(env.CLOUDINARY_API_SECRET || '').trim();
  const cloudinaryDeliveryType = String(env.CLOUDINARY_DELIVERY_TYPE || 'authenticated').trim();
  const cloudinaryConfigured = Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);
  const useCloudinary = cloudinaryConfigured && (provider === 'cloudinary' || (provider === 'auto' && !s3Configured));
  const useS3 = s3Configured && !useCloudinary && ['auto', 's3', 'object'].includes(provider);
  const client = useS3
    ? new S3Client({
        endpoint,
        region,
        forcePathStyle: String(env.OBJECT_STORAGE_FORCE_PATH_STYLE || '').toLowerCase() === 'true',
        credentials: { accessKeyId, secretAccessKey }
      })
    : null;
  const cloudinary = options.cloudinaryClient || cloudinarySdk;
  const fetchImpl = options.fetchImpl || fetch;
  if (useCloudinary && !options.cloudinaryClient) {
    cloudinary.config({
      cloud_name: cloudinaryCloudName,
      api_key: cloudinaryApiKey,
      api_secret: cloudinaryApiSecret,
      secure: true
    });
  }

  function getLocalPath(rawKey) {
    const key = normalizeStorageKey(rawKey);
    const filePath = resolve(localRoot, key);
    if (!filePath.startsWith(`${localRoot}/`) && filePath !== localRoot) {
      throw new Error('Invalid asset storage key');
    }
    return filePath;
  }

  async function getUrl(rawKey) {
    const key = normalizeStorageKey(rawKey);
    if (useCloudinary) {
      const descriptor = getCloudinaryDescriptor(key);
      return cloudinary.url(descriptor.publicId, {
        secure: true,
        resource_type: descriptor.resourceType,
        type: cloudinaryDeliveryType,
        sign_url: cloudinaryDeliveryType !== 'upload',
        ...(descriptor.format ? { format: descriptor.format } : {})
      });
    }
    if (!client) return `${publicBaseUrl}/assets/${encodeStorageKey(key)}`;
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: signedUrlTtlSeconds
    });
  }

  async function putObject({ key: rawKey, data, contentType = 'application/octet-stream', contentDisposition = '' }) {
    const key = normalizeStorageKey(rawKey);
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (useCloudinary) {
      const descriptor = getCloudinaryDescriptor(key, contentType);
      const dataUriContentType = String(contentType || 'application/octet-stream').split(';', 1)[0].trim();
      await cloudinary.uploader.upload(`data:${dataUriContentType};base64,${body.toString('base64')}`, {
        public_id: descriptor.publicId,
        resource_type: descriptor.resourceType,
        type: cloudinaryDeliveryType,
        overwrite: true,
        invalidate: true,
        unique_filename: false,
        use_filename: false,
        ...(descriptor.format ? { format: descriptor.format } : {})
      });
      return { storageKey: key, filePath: '', url: await getUrl(key), mode: 'cloudinary' };
    }
    if (client) {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(contentDisposition ? { ContentDisposition: contentDisposition } : {})
      }));
      return { storageKey: key, filePath: '', url: await getUrl(key), mode: 'object' };
    }
    const filePath = getLocalPath(key);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, body);
    return { storageKey: key, filePath, url: await getUrl(key), mode: 'filesystem' };
  }

  async function getObject(rawKey) {
    const key = normalizeStorageKey(rawKey);
    if (useCloudinary) {
      const response = await fetchImpl(await getUrl(key));
      if (!response.ok) throw new Error(`Stored asset could not be read (${response.status})`);
      return {
        data: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get('content-type') || 'application/octet-stream'
      };
    }
    if (client) {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return {
        data: await bodyToBuffer(result.Body),
        contentType: result.ContentType || 'application/octet-stream'
      };
    }
    const filePath = getLocalPath(key);
    if (!existsSync(filePath)) throw new Error('Stored asset not found');
    return { data: readFileSync(filePath), contentType: 'application/octet-stream' };
  }

  async function deleteObject(rawKey) {
    const key = normalizeStorageKey(rawKey);
    if (useCloudinary) {
      const descriptor = getCloudinaryDescriptor(key);
      await cloudinary.uploader.destroy(descriptor.publicId, {
        resource_type: descriptor.resourceType,
        type: cloudinaryDeliveryType,
        invalidate: true
      });
      return { storageKey: key, deleted: true, mode: 'cloudinary' };
    }
    if (client) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      return { storageKey: key, deleted: true, mode: 'object' };
    }
    const filePath = getLocalPath(key);
    if (existsSync(filePath)) rmSync(filePath, { force: true });
    return { storageKey: key, deleted: true, mode: 'filesystem' };
  }

  function readLocalObject(rawKey) {
    if (client || useCloudinary) return null;
    const filePath = getLocalPath(rawKey);
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath);
  }

  return {
    mode: useCloudinary ? 'cloudinary' : client ? 'object' : 'filesystem',
    configured: Boolean(client || useCloudinary),
    localRoot,
    signedUrlTtlSeconds,
    putObject,
    getObject,
    deleteObject,
    getUrl,
    readLocalObject,
    health() {
      return {
        mode: useCloudinary ? 'cloudinary' : client ? 'object' : 'filesystem',
        provider: useCloudinary ? 'cloudinary' : client ? 's3' : 'filesystem',
        durable: Boolean(client || useCloudinary),
        cloudinaryConfigured,
        cloudinaryCloudName: useCloudinary ? cloudinaryCloudName : '',
        cloudinaryDeliveryType: useCloudinary ? cloudinaryDeliveryType : '',
        bucketConfigured: Boolean(bucket),
        endpointConfigured: Boolean(endpoint),
        signedUrlTtlSeconds
      };
    }
  };
}
