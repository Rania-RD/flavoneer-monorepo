import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface TimerDisplayProps {
  initialTime: number;
  onComplete: () => void;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  initialTime,
  onComplete,
}) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft, onComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((initialTime - timeLeft) / initialTime) * 100;

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            className="text-gray-200 dark:text-slate-700"
            cx="32"
            cy="32"
            fill="transparent"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
          />
          <circle
            className="text-blue-500 transition-all duration-1000 ease-linear"
            cx="32"
            cy="32"
            fill="transparent"
            r="28"
            stroke="currentColor"
            strokeDasharray={175.84}
            strokeDashoffset={175.84 - (progress / 100) * 175.84}
            strokeWidth="4"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-bold text-blue-600 text-xs dark:text-blue-400">
          {Math.round(progress)}%
        </div>
      </div>
      <div>
        <div className="font-bold font-mono text-2xl text-gray-900 dark:text-white">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <div className="mt-1 flex gap-2">
          <button
            className="font-bold text-blue-600 text-xs hover:underline"
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? t("pause") : t("resume")}
          </button>
          <button
            className="font-bold text-gray-500 text-xs hover:underline"
            onClick={() => {
              setIsRunning(false);
              setTimeLeft(initialTime);
            }}
          >
            {t("reset")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimerDisplay;
