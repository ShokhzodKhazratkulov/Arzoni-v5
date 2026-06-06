export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-side-mock-id';
  }
  
  const key = 'arzoni_device_id';
  let deviceId = localStorage.getItem(key);
  
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      // Fallback pseudo-UUID if crypto.randomUUID is not available
      deviceId = 'fxxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    localStorage.setItem(key, deviceId);
  }
  
  return deviceId;
}
