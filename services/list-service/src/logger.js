const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

export function createLogger(serviceName, level = 'info') {
  const minimum = LEVELS[level] ?? LEVELS.info;

  function write(entryLevel, message, fields = {}) {
    if ((LEVELS[entryLevel] ?? LEVELS.info) > minimum) {
      return;
    }

    const record = {
      timestamp: new Date().toISOString(),
      level: entryLevel,
      service: serviceName,
      message,
      ...fields
    };

    const line = JSON.stringify(record);
    if (entryLevel === 'error') {
      console.error(line);
      return;
    }
    console.log(line);
  }

  return {
    error: (message, fields) => write('error', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    info: (message, fields) => write('info', message, fields),
    debug: (message, fields) => write('debug', message, fields)
  };
}
