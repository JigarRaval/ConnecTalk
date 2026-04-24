import { useEffect, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { buildImageUrl, buildUploadUrl } from "../utils/media";

const getMediaUrl = (filePath) => buildUploadUrl(filePath);

const StatusViewer = ({ statuses, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const touchStartX = useRef(0);

  const currentStatus = statuses[currentIndex];

  useEffect(() => {
    if (!currentStatus) return undefined;

    startProgress();

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    };
  }, [currentIndex, currentStatus]);

  const startProgress = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setProgress(0);

    const duration = currentStatus.mediaType === "video" ? 10000 : 5000;
    const increment = 100 / (duration / 100);

    progressIntervalRef.current = setInterval(() => {
      setProgress((previous) => {
        if (previous >= 100) {
          clearInterval(progressIntervalRef.current);
          nextStatus();
          return 0;
        }
        return previous + increment;
      });
    }, 100);
  };

  const nextStatus = () => {
    if (currentIndex + 1 < statuses.length) {
      setCurrentIndex((previous) => previous + 1);
    } else {
      onClose();
    }
  };

  const prevStatus = () => {
    if (currentIndex - 1 >= 0) {
      setCurrentIndex((previous) => previous - 1);
    }
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    const difference = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(difference) > 50) {
      if (difference > 0) prevStatus();
      else nextStatus();
    }
  };

  if (!currentStatus) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/95 animate-fade-in"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative flex h-full max-h-screen w-full max-w-2xl flex-col">
        <div className="absolute left-0 right-0 top-0 z-10 flex gap-1 p-3">
          {statuses.map((_, index) => (
            <div key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-100"
                style={{
                  width: `${
                    index === currentIndex ? progress : index < currentIndex ? 100 : 0
                  }%`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute left-4 top-7 z-10 flex items-center gap-3 rounded-full border border-white/10 bg-black/30 py-1 pl-2 pr-4 backdrop-blur-sm">
          <img
            src={buildImageUrl(currentStatus.user?.image)}
            className="h-10 w-10 rounded-full border border-white/50 object-cover shadow-md"
            alt={currentStatus.user?.username}
            onError={(event) => {
              event.target.src = "/default-avatar.png";
            }}
          />
          <span className="text-sm font-medium text-white">
            {currentStatus.user?.username}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center p-4">
          {currentStatus.mediaType === "image" ? (
            <img
              src={getMediaUrl(currentStatus.mediaUrl)}
              className="max-h-full max-w-full rounded-[28px] border border-white/10 object-contain shadow-2xl"
              alt="status"
            />
          ) : (
            <video
              ref={videoRef}
              src={getMediaUrl(currentStatus.mediaUrl)}
              className="max-h-full max-w-full rounded-[28px] border border-white/10 shadow-2xl"
              autoPlay
              onEnded={nextStatus}
              playsInline
              controls={false}
            />
          )}
        </div>

        <button
          onClick={prevStatus}
          className="absolute left-0 top-1/2 flex h-full w-1/3 -translate-y-1/2 items-center justify-start pl-4 text-white/30 transition hover:text-white/80"
          aria-label="Previous"
        >
          <FaChevronLeft size={32} />
        </button>

        <button
          onClick={nextStatus}
          className="absolute right-0 top-1/2 flex h-full w-1/3 -translate-y-1/2 items-center justify-end pr-4 text-white/30 transition hover:text-white/80"
          aria-label="Next"
        >
          <FaChevronRight size={32} />
        </button>

        <button
          onClick={onClose}
          className="absolute right-4 top-5 rounded-full border border-white/10 bg-black/30 p-2 text-white/70 backdrop-blur-sm transition hover:scale-105 hover:text-white"
          aria-label="Close"
        >
          <FaTimes size={20} />
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default StatusViewer;
