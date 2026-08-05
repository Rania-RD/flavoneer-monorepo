import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { createHotUpdaterDeployEnv } from '@flavoneer/config/env/server';
import { s3Storage } from '@hot-updater/aws';
import { expo } from '@hot-updater/expo';
import { standaloneRepository } from '@hot-updater/standalone';
import { config } from 'dotenv';
import { defineConfig } from 'hot-updater';

config({ path: '.env.hotupdater' });

function createDeployEnv() {
  return createHotUpdaterDeployEnv({
    HOT_UPDATER_API_TOKEN: process.env.HOT_UPDATER_API_TOKEN,
    HOT_UPDATER_S3_ACCESS_KEY_ID: process.env.HOT_UPDATER_S3_ACCESS_KEY_ID,
    HOT_UPDATER_S3_BASE_PATH: process.env.HOT_UPDATER_S3_BASE_PATH,
    HOT_UPDATER_S3_BUCKET: process.env.HOT_UPDATER_S3_BUCKET,
    HOT_UPDATER_S3_ENDPOINT: process.env.HOT_UPDATER_S3_ENDPOINT,
    HOT_UPDATER_S3_REGION: process.env.HOT_UPDATER_S3_REGION,
    HOT_UPDATER_S3_SECRET_ACCESS_KEY: process.env.HOT_UPDATER_S3_SECRET_ACCESS_KEY,
    HOT_UPDATER_SERVER_URL: process.env.HOT_UPDATER_SERVER_URL,
  });
}

const storage = () => {
  const env = createDeployEnv();
  const bucketName = env.s3Bucket;
  const region = env.s3Region;
  const endpoint = env.s3Endpoint;
  const basePath = env.s3BasePath;
  const credentials = {
    accessKeyId: env.s3AccessKeyId,
    secretAccessKey: env.s3SecretAccessKey,
  };
  const baseStorage = s3Storage({
    bucketName,
    region,
    endpoint,
    forcePathStyle: false,
    basePath,
    credentials,
  });
  const gatewayEndpoint = new URL(endpoint);
  gatewayEndpoint.hostname = `${bucketName}.${gatewayEndpoint.hostname}`;
  const gatewayClient = new S3Client({
    region,
    endpoint: gatewayEndpoint.toString(),
    forcePathStyle: true,
    credentials,
  });
  const deleteFromGateway = async (storageUri: string) => {
    const url = new URL(storageUri);
    const storageKey = url.pathname.slice(1);
    const prefix = `${basePath}/`;
    if (url.protocol !== 's3:' || url.hostname !== bucketName || !storageKey.startsWith(prefix)) {
      throw new Error('Unexpected Hot Updater storage URI');
    }

    // The shared gateway maps the first object-key segment to its physical
    // bucket. Address that namespace directly when deleting an object prefix.
    const physicalBucket = basePath;
    const physicalPrefix = storageKey.slice(prefix.length);
    let deletedCount = 0;
    while (true) {
      const listed = await gatewayClient.send(
        new ListObjectsV2Command({
          Bucket: physicalBucket,
          Prefix: physicalPrefix,
        }),
      );
      const objects = (listed.Contents ?? []).flatMap(({ Key }) => (Key ? [{ Key }] : []));
      if (objects.length === 0) {
        break;
      }
      await gatewayClient.send(
        new DeleteObjectsCommand({
          Bucket: physicalBucket,
          Delete: { Objects: objects, Quiet: true },
        }),
      );
      deletedCount += objects.length;
    }

    if (deletedCount === 0) {
      throw new Error('Bundle Not Found');
    }
  };
  const plugin = baseStorage();
  const exists = plugin.profiles.node.exists;

  return {
    ...plugin,
    profiles: {
      ...plugin.profiles,
      node: {
        ...plugin.profiles.node,
        delete: deleteFromGateway,
        exists: async (storageUri: string) => {
          try {
            return await exists(storageUri);
          } catch (error) {
            const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
              ?.httpStatusCode;

            // This S3 proxy can return 403 for HEAD requests to existing
            // content-addressed objects. Uploading the same key is safe.
            if (statusCode === 403) {
              return false;
            }
            throw error;
          }
        },
      },
    },
  };
};

export default defineConfig({
  build: expo({
    sourcemap: true,
  }),
  storage,
  database: () => {
    const env = createDeployEnv();
    return standaloneRepository({
      baseUrl: env.serverUrl,
      commonHeaders: {
        Authorization: `Bearer ${env.apiToken}`,
      },
    })();
  },
  updateStrategy: 'appVersion',
});
