import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

interface UploadResult {
  storageId: string;
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
  const prepared = await prepareBatchLabelPhoto(uri);
  const photoResponse = await fetch(prepared.uri);
  const photo = await photoResponse.blob();
  const uploadUrl = await getUploadUrl();
  const uploadResponse = await fetch(uploadUrl, {
    body: photo,
    headers: { 'Content-Type': 'image/jpeg' },
    method: 'POST',
  });
  if (!uploadResponse.ok) {
    throw new Error('Batch-label photo upload failed');
  }
  const result = (await uploadResponse.json()) as UploadResult;
  if (!result.storageId) {
    throw new Error('Batch-label photo upload returned no storage ID');
  }
  return result.storageId;
}
