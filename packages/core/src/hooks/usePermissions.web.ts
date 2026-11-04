// Web usePermissions hook
import { useEffect, useState } from "react";

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
 * Web implementation of usePermissions using the Permissions API.
 */
export function usePermissions(): UsePermissionsReturn {
  const [statuses, setStatuses] = useState<Record<PermissionType, PermissionStatus>>(defaultStatuses);

  const check = async (type: PermissionType): Promise<PermissionStatus> => {
    try {
      const permission = await navigator.permissions.query({ name: type as PermissionName });
      const status: PermissionStatus = {
        granted: permission.state === "granted",
        denied: permission.state === "denied",
        prompt: permission.state === "prompt",
        type,
      };
      setStatuses((prev) => ({ ...prev, [type]: status }));
      return status;
    } catch {
      // Fallback for unsupported permissions
      return { granted: false, denied: false, prompt: true, type };
    }
  };

  const request = async (type: PermissionType): Promise<PermissionStatus> => {
    try {
      let result: PermissionStatus;
      
      switch (type) {
        case "camera":
        case "microphone": {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            [type]: true 
          });
          stream.getTracks().forEach((track) => track.stop());
          result = { granted: true, denied: false, prompt: false, type };
          break;
        }
        case "notifications": {
          const permission = await Notification.requestPermission();
          result = { 
            granted: permission === "granted", 
            denied: permission === "denied", 
            prompt: permission === "default", 
            type 
          };
          break;
        }
        case "location": {
          await new Promise<void>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(),
              () => reject(),
              { timeout: 5000 }
            );
          });
          result = { granted: true, denied: false, prompt: false, type };
          break;
        }
        default:
          result = { granted: false, denied: true, prompt: false, type };
      }
      
      setStatuses((prev) => ({ ...prev, [type]: result }));
      return result;
    } catch {
      const denied = { granted: false, denied: true, prompt: false, type };
      setStatuses((prev) => ({ ...prev, [type]: denied }));
      return denied;
    }
  };

  // Check all permissions on mount
  useEffect(() => {
    (Object.keys(defaultStatuses) as PermissionType[]).forEach(check);
  }, []);

  return { statuses, request, check };
}