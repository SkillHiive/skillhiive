// Media hook - MUST be implemented by platform
import { useState, useEffect, useRef } from "react";

export interface MediaStream {
  audio: boolean;
  video: boolean;
  stream: MediaStream | null;
  error: Error | null;
}

export interface UseMediaReturn {
  audio: boolean;
  video: boolean;
  stream: MediaStream | null;
  error: Error | null;
  start: (constraints?: MediaStreamConstraints) => Promise<MediaStream | null>;
  stop: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
}

/**
 * Platform media hook.
 * MUST be implemented by platform-specific file (.web.ts or .native.ts)
 * This base implementation throws to enforce platform implementation.
 */
export function useMedia(): UseMediaReturn {
  const [audio, setAudio] = useState(false);
  const [video, setVideo] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const start = async (constraints?: MediaStreamConstraints): Promise<MediaStream | null> => {
    throw new Error(
      `useMedia.start() not implemented. ` +
      `Create useMedia.web.ts or useMedia.native.ts in your app.`
    );
  };
  
  const stop = () => {
    throw new Error(
      `useMedia.stop() not implemented. ` +
      `Create useMedia.web.ts or useMedia.native.ts in your app.`
    );
  };
  
  const toggleAudio = () => {
    throw new Error(
      `useMedia.toggleAudio() not implemented. ` +
      `Create useMedia.web.ts or useMedia.native.ts in your app.`
    );
  };
  
  const toggleVideo = () => {
    throw new Error(
      `useMedia.toggleVideo() not implemented. ` +
      `Create useMedia.web.ts or useMedia.native.ts in your app.`
    );
  };
  
  return { audio, video, stream, error, start, stop, toggleAudio, toggleVideo };
}