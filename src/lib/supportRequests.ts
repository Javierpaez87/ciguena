import { supabase } from './supabase';

export type SupportRequestType = 'problem' | 'suggestion';
export type SupportPriority = 'urgent' | 'high' | 'medium' | 'low';
export type SupportSource = 'platform' | 'login' | 'register';

export interface SupportAttachmentPayload {
  fileName: string;
  mimeType: string;
  base64: string;
  originalSize: number;
  compressedSize: number;
}

export interface SubmitSupportRequestInput {
  requestType: SupportRequestType;
  priority: SupportPriority;
  source: SupportSource;
  name: string;
  email: string;
  phone: string;
  description: string;
  tenantId?: string | null;
  attachment?: SupportAttachmentPayload | null;
  website?: string;
}

const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_COMPRESSED_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No pudimos preparar la imagen adjunta.'));
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = value.indexOf(',');
      resolve(commaIndex >= 0 ? value.slice(commaIndex + 1) : value);
    };
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No pudimos leer la imagen adjunta.'));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No pudimos comprimir la imagen adjunta.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function compressSupportImage(file: File): Promise<SupportAttachmentPayload> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Adjuntá una imagen JPG, PNG o WEBP.');
  }

  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error('La imagen original no puede superar los 10 MB.');
  }

  const image = await loadImage(file);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = longestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestSide : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No pudimos preparar la imagen adjunta.');
  }

  // Screenshots with transparency are flattened on white before converting to JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let compressed = await canvasToBlob(canvas, 0.78);

  if (compressed.size > MAX_COMPRESSED_IMAGE_BYTES) {
    compressed = await canvasToBlob(canvas, 0.62);
  }

  if (compressed.size > MAX_COMPRESSED_IMAGE_BYTES) {
    throw new Error('La imagen sigue siendo demasiado pesada después de comprimirla. Probá con otra captura.');
  }

  const originalStem = file.name.replace(/\.[^.]+$/, '') || 'captura';

  return {
    fileName: `${originalStem}.jpg`,
    mimeType: 'image/jpeg',
    base64: await blobToBase64(compressed),
    originalSize: file.size,
    compressedSize: compressed.size,
  };
}

export async function submitSupportRequest(input: SubmitSupportRequestInput) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const response = await fetch('/.netlify/functions/create-support-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof result?.error === 'string'
        ? result.error
        : 'No pudimos enviar el reporte. Intentá nuevamente.',
    );
  }

  return result as { ok: true; requestId: string };
}
