// Web useMedia hook
import { useEffect, useRef, useState } from "react";

export interface MediaState {
  audio: boolean;
  video: boolean;
  stream: MediaStream | null;
  error: Error | null;
}

export interface UseMediaReturn extends MediaState {
  start: (constraints?: MediaStreamConstraints) => Promise<MediaStream | null>;
  stop: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
}

/**
 * Web implementation of useMedia using getUserMedia.
 */
export function useMedia(): UseMediaReturn {
  const [audio, setAudio] = useState(false);
  const [video, setVideo] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = async (constraints?: MediaStreamConstraints): Promise<MediaStream | null> => {
    try {
      setError(null);
      const defaultConstraints: MediaStreamConstraints = {
        audio: audio,
        video: video,
        ...constraints,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(defaultConstraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setAudio(mediaStream.getAudioTracks().length > 0);
      setVideo(mediaStream.getVideoTracks().length > 0);
      return mediaStream;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to start media");
      setError(error);
      return null;
    }
  };

  const stop = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setAudio(false);
      setVideo(false);
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const newAudio = !audio;
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = newAudio;
      });
      setAudio(newAudio);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const newVideo = !video;
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = newVideo;
      });
      setVideo(newVideo);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return { audio, video, stream, error, start, stop, toggleAudio, toggleVideo };
}