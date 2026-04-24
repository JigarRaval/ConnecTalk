import { useRef, useState, useEffect } from "react";
import { FaPlay, FaPause } from "react-icons/fa";

const AudioPlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    // Force load metadata if it doesn't fire automatically
    if (audio.readyState >= 1) {
      setDuration(audio.duration || 0);
    } else {
      audio.load();
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [src]);

  const togglePlay = () => {
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (time) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
      <button
        onClick={togglePlay}
        className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center hover:scale-105 transition-all shadow-md"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <FaPause size={12} />
        ) : (
          <FaPlay size={12} className="ml-0.5" />
        )}
      </button>
      <div className="flex-1 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-200"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="text-xs font-mono text-gray-600 dark:text-gray-300 min-w-[60px] text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
};

export default AudioPlayer;
