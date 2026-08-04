import { s3Storage } from '@hot-updater/aws';
import { expo } from '@hot-updater/expo';
import { standaloneRepository } from '@hot-updater/standalone';
import { config } from 'dotenv';
import { defineConfig } from 'hot-updater';

config({ path: '.env.hotupdater' });

const accessKeyId = process.env.HOT_UPDATER_S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey =
  process.env.HOT_UPDATER_S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
const endpoint = process.env.HOT_UPDATER_S3_ENDPOINT;
const apiToken = process.env.HOT_UPDATER_API_TOKEN;

export default defineConfig({
  build: expo({
    sourcemap: true,
  }),
  storage: s3Storage({
    bucketName: process.env.HOT_UPDATER_S3_BUCKET ?? '',
    region: process.env.HOT_UPDATER_S3_REGION ?? 'auto',
    basePath: process.env.HOT_UPDATER_S3_BASE_PATH ?? 'mobile',
    ...(endpoint ? { endpoint } : {}),
    ...(accessKeyId && secretAccessKey
      ? {
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        }
      : {}),
  }),
  database: standaloneRepository({
    baseUrl: process.env.HOT_UPDATER_SERVER_URL ?? '',
    ...(apiToken
      ? {
          commonHeaders: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      : {}),
  }),
  updateStrategy: 'appVersion',
});
