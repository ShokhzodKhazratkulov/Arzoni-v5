import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../supabase';
import imageCompression from 'browser-image-compression';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMapUrl(lat: number, lng: number, name: string) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const encodedName = encodeURIComponent(name);

  if (isMobile) {
    // Try Yandex Maps first as it's popular in Uzbekistan
    // We use a universal link that can open the app or fallback to browser
    return `https://yandex.com/maps/?pt=${lng},${lat}&z=16&l=map&text=${encodedName}`;
  } else {
    // Google Maps for desktop
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
}

export const uploadImage = async (file: File, path: string) => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  let fileToUpload = file;
  try {
    fileToUpload = await imageCompression(file, options);
  } catch (error) {
    console.error('Compression failed, uploading original:', error);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(filePath, fileToUpload);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(filePath);

  return publicUrl;
};
