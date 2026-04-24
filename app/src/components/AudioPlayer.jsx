import { useEffect, useRef, useState } from "react";
import { FaPause, FaPlay } from "react-icons/fa";

const AudioPlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }

    setPlaying(!playing);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current?.currentTime || 0);
  };

  const formatTime = (time) => {
    if (Number.isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 rounded-full border border-stone-200 bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:border-stone-700 dark:bg-stone-800/80">
      <button
        onClick={togglePlay}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white shadow-md transition hover:scale-105 dark:bg-amber-500 dark:text-stone-950"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <FaPause size={12} /> : <FaPlay size={12} className="ml-0.5" />}
      </button>

      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-300 dark:bg-stone-600">
        <div
          className="h-full rounded-full bg-stone-900 transition-all duration-200 dark:bg-amber-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="min-w-[60px] text-right text-xs font-mono text-stone-600 dark:text-stone-300">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
};

export default AudioPlayer;
