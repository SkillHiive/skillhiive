// Platform permissions hook - MUST be implemented by platform
import { useState, useEffect } from "react";

export type PermissionType = "camera" | "microphone" | "notifications" | "location" | "contacts" | "photos";

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  type: PermissionType;
}

export interface UsePermissionsReturn {
  statuses: Record<PermissionType, PermissionStatus>;
  request: (type: PermissionType) => Promise<PermissionStatus>;
  check: (type: PermissionType) => Promise<PermissionStatus>;
}

const defaultStatuses: Record<PermissionType, PermissionStatus> = {
  camera: { granted: false, denied: false, prompt: true, type: "camera" },
  microphone: { granted: false, denied: false, prompt: true, type: "microphone" },
  notifications: { granted: false, denied: false, prompt: true, type: "notifications" },
  location: { granted: false, denied: false, prompt: true, type: "location" },
  contacts: { granted: false, denied: false, prompt: true, type: "contacts" },
  photos: { granted: false, denied: false, prompt: true, type: "photos" },
};

/**
 * Platform permissions hook.
 * MUST be implemented by platform-specific file (.web.ts or .native.ts)
 * This base implementation throws to enforce platform implementation.
 */
export function usePermissions(): UsePermissionsReturn {
  const [statuses, setStatuses] = useState<Record<PermissionType, PermissionStatus>>(defaultStatuses);
  
  // This will be replaced by platform implementation
  const request = async (type: PermissionType): Promise<PermissionStatus> => {
    throw new Error(
      `usePermissions.request("${type}") not implemented. ` +
      `Create usePermissions.web.ts or usePermissions.native.ts in your app.`
    );
  };
  
  const check = async (type: PermissionType): Promise<PermissionStatus> => {
    throw new Error(
      `usePermissions.check("${type}") not implemented. ` +
      `Create usePermissions.web.ts or usePermissions.native.ts in your app.`
    );
  };
  
  return { statuses, request, check };
}