// src/hooks/useMusicPlayer.ts
import { useState, useRef, useCallback } from 'react';

export function useMusicPlayer() {
  const globalAudioRef = useRef<HTMLAudioElement | null>(null);
  const [globalMusicPlaying, setGlobalMusicPlaying] = useState(false);
  const [globalMusicUrl, setGlobalMusicUrl] = useState('');
  const [globalVolume, setGlobalVolume] = useState(0.5);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);

  // 集中式音频播放控制
  const playAudio = useCallback(async (audioObj: HTMLAudioElement) => {
    try {
      await audioObj.play();
      setGlobalMusicPlaying(true);
    } catch (err) {
      console.warn('音频播放受阻或失败:', err);
      setGlobalMusicPlaying(false);
      throw err; // 让调用方处理错误提示
    }
  }, []);

  // 播放指定 URL 的音乐
  const handlePlayMusic = useCallback(
    (url: string) => {
      if (!url) {
        if (globalAudioRef.current) {
          globalAudioRef.current.pause();
          globalAudioRef.current = null;
        }
        setGlobalMusicPlaying(false);
        setGlobalMusicUrl('');
        setShowMusicPlayer(false);
        return;
      }

      if (globalAudioRef.current) {
        globalAudioRef.current.pause();
      }
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.volume = globalVolume;
      audio.loop = true;

      globalAudioRef.current = audio;
      setGlobalMusicUrl(url);
      setShowMusicPlayer(true);
      playAudio(audio).catch(() => {
        // 播放失败由调用方处理
      });
    },
    [globalVolume, playAudio]
  );

  // 切换播放/暂停
  const togglePlayPause = useCallback(() => {
    if (globalAudioRef.current) {
      if (globalMusicPlaying) {
        globalAudioRef.current.pause();
        setGlobalMusicPlaying(false);
      } else {
        playAudio(globalAudioRef.current);
      }
    }
  }, [globalMusicPlaying, playAudio]);

  // 调整音量
  const setVolume = useCallback((vol: number) => {
    setGlobalVolume(vol);
    if (globalAudioRef.current) {
      globalAudioRef.current.volume = vol;
    }
  }, []);

  // 关闭音乐播放器
  const closePlayer = useCallback(() => {
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
      globalAudioRef.current = null;
    }
    setGlobalMusicPlaying(false);
    setGlobalMusicUrl('');
    setShowMusicPlayer(false);
  }, []);

  // 从配置 URL 启动音乐
  const startMusicFromUrl = useCallback(
    (musicUrl: string) => {
      if (!musicUrl) return;

      let audio = globalAudioRef.current;
      if (!audio) {
        audio = new Audio(musicUrl);
        audio.crossOrigin = 'anonymous';
        audio.volume = globalVolume;
        audio.loop = true;
        globalAudioRef.current = audio;
      } else if (audio.src !== musicUrl) {
        audio.pause();
        audio = new Audio(musicUrl);
        audio.crossOrigin = 'anonymous';
        audio.volume = globalVolume;
        audio.loop = true;
        globalAudioRef.current = audio;
      }

      setGlobalMusicUrl(musicUrl);
      setShowMusicPlayer(true);
      playAudio(audio).catch(() => {});
    },
    [globalVolume, playAudio]
  );

  // 清理（组件卸载时）
  const cleanup = useCallback(() => {
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
      globalAudioRef.current = null;
    }
  }, []);

  return {
    globalAudioRef,
    globalMusicPlaying,
    setGlobalMusicPlaying,
    globalMusicUrl,
    setGlobalMusicUrl,
    globalVolume,
    setGlobalVolume: setVolume,
    showMusicPlayer,
    setShowMusicPlayer,
    playAudio,
    handlePlayMusic,
    togglePlayPause,
    closePlayer,
    startMusicFromUrl,
    cleanup,
  };
}
