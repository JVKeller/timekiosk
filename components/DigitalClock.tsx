import React, { useState, useEffect } from 'react';

const DigitalClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="text-center text-white p-6 rounded-2xl bg-black bg-opacity-20 w-full max-w-5xl">
      <p 
        className="tracking-wide opacity-80 leading-none mb1"
        style={{ fontSize: 'clamp(1.25rem, 3vw, 3.75rem)' }}
      >
        {formatDate(time)}
      </p>
      <h1 
        className="font-mono font-bold tracking-widest whitespace-nowrap leading-none"
        style={{ fontSize: 'clamp(2.5rem, 7vw, 7rem)' }}
      >
        {formatTime(time)}
      </h1>
    </div>
  );
};

export default DigitalClock;