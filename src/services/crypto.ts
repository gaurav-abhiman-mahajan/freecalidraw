// End-to-end encryption using Web Crypto API (AES-GCM 256-bit)

export async function generateSecretKey(): Promise<string> {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return bufferToBase64Url(exported);
}

async function importSecretKey(keyBase64Url: string): Promise<CryptoKey> {
  const rawKey = base64UrlToBuffer(keyBase64Url);
  return window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPayload(data: unknown, keyBase64Url: string): Promise<string> {
  const key = await importSecretKey(keyBase64Url);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(JSON.stringify(data));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encodedData
  );

  // Combine IV (12 bytes) + ciphertext
  const combined = new Uint8Array(iv.byteLength + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.byteLength);

  return bufferToBase64Url(combined.buffer);
}

export async function decryptPayload<T>(encryptedBase64Url: string, keyBase64Url: string): Promise<T> {
  const key = await importSecretKey(keyBase64Url);
  const combined = new Uint8Array(base64UrlToBuffer(encryptedBase64Url));

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    ciphertext
  );

  const text = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(text) as T;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function parseRoomUrl(): { roomId: string; key: string } | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const match = hash.match(/room=([^,]+),([a-zA-Z0-9_-]+)/);
  if (match) {
    return { roomId: match[1], key: match[2] };
  }
  return null;
}

export function createRoomUrl(roomId: string, key: string): string {
  const url = new URL(window.location.href);
  url.hash = `room=${roomId},${key}`;
  return url.toString();
}

export function clearRoomUrl(): void {
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState(null, "", url.toString());
}
