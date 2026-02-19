'use client';

import { useCallback, useRef } from 'react';

export type SoundEffect = 
  | 'login'
  | 'success' 
  | 'error' 
  | 'click' 
  | 'swoosh'
  | 'redeem';

const createSynth = () => {
  if (typeof window === 'undefined') return null;
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (!audioCtx) return null;

  const play = (sound: SoundEffect) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    switch (sound) {
      case 'click':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
        break;
      case 'login':
      case 'success':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2); // A6
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
        break;
      case 'error':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
        break;
      case 'swoosh':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.15);
        break;
      case 'redeem':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
        setTimeout(() => {
            const o2 = audioCtx.createOscillator();
            const g2 = audioCtx.createGain();
            g2.gain.setValueAtTime(0.1, audioCtx.currentTime);
            o2.connect(g2);
            g2.connect(audioCtx.destination);
            o2.type = 'triangle';
            o2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
            g2.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
            o2.start(audioCtx.currentTime);
            o2.stop(audioCtx.currentTime + 0.3);
        }, 100);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
        break;
    }
  };

  return { play };
};

export const useArcadeSound = () => {
  const synthRef = useRef<ReturnType<typeof createSynth>>(null);

  if (!synthRef.current) {
    (synthRef as any).current = createSynth();
  }

  const playSound = useCallback((sound: SoundEffect) => {
    synthRef.current?.play(sound);
  }, []);

  return playSound;
};