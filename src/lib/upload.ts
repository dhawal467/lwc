import imageCompression from 'browser-image-compression';
import { createClient } from './supabase/client';

export async function compressAndUpload(file: File, path: string, bucket: string = 'qc-photos'): Promise<string> {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, compressedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in compressAndUpload:', error);
    throw error;
  }
}
