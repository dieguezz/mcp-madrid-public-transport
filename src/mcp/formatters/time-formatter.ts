// Pure function: Format seconds to human-readable time
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);

  if (seconds < 60) {
    return 'en menos de 1 minuto';
  }

  if (minutes < 10) {
    return `en ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }

  // For times > 10 minutes, show absolute time
  const now = new Date();
  const arrivalTime = new Date(now.getTime() + seconds * 1000);
  const hours = arrivalTime.getHours().toString().padStart(2, '0');
  const mins = arrivalTime.getMinutes().toString().padStart(2, '0');

  return `a las ${hours}:${mins}`;
};

// Pure function: Format absolute time
export const formatAbsoluteTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};
