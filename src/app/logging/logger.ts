export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  eventName: string;
  context: Record<string, unknown>;
}

export type LogSink = (entry: LogEntry) => void;

export interface Logger {
  info(eventName: string, context?: Record<string, unknown>): void;
  warn(eventName: string, context?: Record<string, unknown>): void;
  error(eventName: string, context?: Record<string, unknown>): void;
}

function createConsoleSink(): LogSink {
  return (entry) => {
    const output = [entry.eventName, entry.context];

    if (entry.level === "error") {
      console.error(...output);
      return;
    }

    if (entry.level === "warn") {
      console.warn(...output);
      return;
    }

    console.info(...output);
  };
}

export function createLogger(
  sink: LogSink = createConsoleSink(),
  clock: () => string = () => new Date().toISOString()
): Logger {
  const write = (level: LogLevel, eventName: string, context: Record<string, unknown> = {}): void => {
    sink({
      timestamp: clock(),
      level,
      eventName,
      context
    });
  };

  return {
    info: (eventName, context) => write("info", eventName, context),
    warn: (eventName, context) => write("warn", eventName, context),
    error: (eventName, context) => write("error", eventName, context)
  };
}
