import { File, UploadType } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

interface UploadResult {
  storageId: string;
}

export type BatchLabelPhotoUploadPhase =
  | 'prepare-photo'
  | 'request-upload-url'
  | 'upload-photo'
  | 'read-upload-response';

export class BatchLabelPhotoUploadError extends Error {
  readonly phase: BatchLabelPhotoUploadPhase;

  constructor(message: string, phase: BatchLabelPhotoUploadPhase, cause?: unknown) {
    super(message, { cause });
    this.name = 'BatchLabelPhotoUploadError';
    this.phase = phase;
  }
}

export async function prepareBatchLabelPhoto(uri: string) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ height: null, width: 1600 });
  const image = await context.renderAsync();
  return await image.saveAsync({
    compress: 0.76,
    format: SaveFormat.JPEG,
  });
}

export async function uploadBatchLabelPhoto(uri: string, getUploadUrl: () => Promise<string>) {
  let prepared: Awaited<ReturnType<typeof prepareBatchLabelPhoto>>;
  try {
    prepared = await prepareBatchLabelPhoto(uri);
  } catch (error) {
    throw new BatchLabelPhotoUploadError(
      'Could not prepare the batch-label photo',
      'prepare-photo',
      error,
    );
  }

  const photo = new File(prepared.uri);
  if (!photo.exists) {
    throw new BatchLabelPhotoUploadError(
      'The prepared batch-label photo does not exist',
      'prepare-photo',
    );
  }

  let uploadUrl: string;
  try {
    uploadUrl = await getUploadUrl();
  } catch (error) {
    throw new BatchLabelPhotoUploadError(
      'Could not request a batch-label photo upload URL',
      'request-upload-url',
      error,
    );
  }

  let uploadResponse: Awaited<ReturnType<File['upload']>>;
  try {
    uploadResponse = await photo.upload(uploadUrl, {
      headers: { 'Content-Type': 'image/jpeg' },
      httpMethod: 'POST',
      mimeType: 'image/jpeg',
      sessionType: 'foreground',
      uploadType: UploadType.BINARY_CONTENT,
    });
  } catch (error) {
    throw new BatchLabelPhotoUploadError(
      'Could not upload the batch-label photo',
      'upload-photo',
      error,
    );
  }

  if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
    const responseDetail = uploadResponse.body.trim().slice(0, 500);
    throw new BatchLabelPhotoUploadError(
      `Batch-label photo upload returned HTTP ${uploadResponse.status}${
        responseDetail ? `: ${responseDetail}` : ''
      }`,
      'upload-photo',
    );
  }

  let result: unknown;
  try {
    result = JSON.parse(uploadResponse.body);
  } catch (error) {
    throw new BatchLabelPhotoUploadError(
      'Batch-label photo upload returned invalid JSON',
      'read-upload-response',
      error,
    );
  }

  if (!isUploadResult(result)) {
    throw new BatchLabelPhotoUploadError(
      'Batch-label photo upload returned no storage ID',
      'read-upload-response',
    );
  }
  return result.storageId;
}

function isUploadResult(value: unknown): value is UploadResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'storageId' in value &&
    typeof value.storageId === 'string' &&
    value.storageId.length > 0
  );
}
