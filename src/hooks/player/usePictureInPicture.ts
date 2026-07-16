import { useCallback, useState } from 'react';
import type { RefObject } from 'react';
import type { VideoRef } from 'react-native-video';

export function usePictureInPicture(videoRef: RefObject<VideoRef | null>) {
  const [isInPiP, setIsInPiP] = useState(false);

  const enterPiP = useCallback(() => {
    videoRef.current?.enterPictureInPicture();
  }, [videoRef]);

  const exitPiP = useCallback(() => {
    videoRef.current?.exitPictureInPicture();
  }, [videoRef]);

  const onPictureInPictureStatusChanged = useCallback((e: { isActive: boolean }) => {
    setIsInPiP(e.isActive);
  }, []);

  return { isInPiP, enterPiP, exitPiP, onPictureInPictureStatusChanged };
}
