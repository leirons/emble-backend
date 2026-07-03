import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env.js';

export const s3 = new S3Client({
  endpoint: env.s3.endpoint,
  region: env.s3.region,
  credentials: env.s3.accessKeyId
    ? { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
    : undefined,
  forcePathStyle: true, // нужно для MinIO/R2
});

/**
 * Загрузить буфер файла в бакет базы знаний.
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function uploadKnowledgeFile({ agentId, originalName, buffer, mimeType }) {
  const safeName = originalName.replace(/[^\w.\-]+/g, '_');
  const key = `knowledge/${agentId}/${uuid()}-${safeName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const url = env.s3.publicBaseUrl ? `${env.s3.publicBaseUrl}/${key}` : key;
  return { key, url };
}

export async function getObjectBuffer(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteObject(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key }));
}

export async function getSignedDownloadUrl(key, expiresInSeconds = 3600) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}

export default { s3, uploadKnowledgeFile, getObjectBuffer, deleteObject, getSignedDownloadUrl };
