import React from 'react';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';

const TimerControl: React.FC<{ isPaused: boolean; onToggle: () => void; }> = ({ isPaused, onToggle }) => (
    <button
      onClick={onToggle}
      className="fixed top-4 right-4 z-[200] bg-slate-700 bg-opacity-80 text-white rounded-full p-3 hover:bg-teal-600 transition-colors shadow-lg"
      aria-label={isPaused ? "Resume Timer" : "Pause Timer"}
      title={isPaused ? "Resume Timer" : "Pause Timer"}
    >
      {isPaused ? <PlayIcon className="w-6 h-6" /> : <PauseIcon className="w-6 h-6" />}
    </button>
);

export default TimerControl;
