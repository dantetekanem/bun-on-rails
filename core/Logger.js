import winston from 'winston';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import http from 'http'; // Import http for STATUS_CODES

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log formats
const formatWithTimeAndColor = winston.format.printf(({ level, message, timestamp, skipMeta, ...metadata }) => {
  let colorizedLevel;
  switch(level) {
    case 'error': colorizedLevel = chalk.red.bold(level.toUpperCase()); break;
    case 'warn': colorizedLevel = chalk.yellow.bold(level.toUpperCase()); break;
    case 'info': colorizedLevel = chalk.green(level.toUpperCase()); break;
    case 'debug': colorizedLevel = chalk.blue(level.toUpperCase()); break;
    default: colorizedLevel = level.toUpperCase();
  }
  
  // Format timestamp for readability
  const ts = new Date(timestamp).toISOString().replace('T', ' ').replace('Z', '');
  
  // Handle additional metadata - only if skipMeta is not true
  let metaStr = '';
  if (!skipMeta) {
    if (Object.keys(metadata).length > 0 && metadata.stack !== undefined) {
      metaStr = `\n${metadata.stack}`;
    } else if (Object.keys(metadata).length > 0) {
      metaStr = `\n${JSON.stringify(metadata, null, 2)}`;
    }
  }
  
  return `[${ts}] ${colorizedLevel}: ${message}${metaStr}`;
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // Console output with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        formatWithTimeAndColor
      )
    }),
    // Log to files
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log') 
    }),
    // Separate log for SQL queries
    new winston.transports.File({ 
      filename: path.join(logsDir, 'sql.log'),
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => {
          if (info.type === 'sql') {
            return `[${new Date(info.timestamp).toISOString().replace('T', ' ').replace('Z', '')}] SQL (${info.duration}ms): ${info.query}`;
          }
          return null;
        })
      )
    }),
  ],
  // Don't exit on error
  exitOnError: false
});

// Custom profiler
const timers = new Map();

// Extended logger with timing capabilities
const extendedLogger = {
  // Standard logging methods
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Timing methods
  startTimer: (label) => {
    const startTime = process.hrtime();
    timers.set(label, startTime);
    return label;
  },
  
  endTimer: (label) => {
    const startTime = timers.get(label);
    if (!startTime) {
      logger.warn(`Timer ${label} does not exist`);
      return 0;
    }
    
    const diff = process.hrtime(startTime);
    const duration = Math.round((diff[0] * 1e9 + diff[1]) / 1e6); // Convert to ms
    timers.delete(label);
    return duration;
  },
  
  logTimingEnd: (label, message = null, isError = false) => {
    const duration = extendedLogger.endTimer(typeof label === 'string' ? label : label);
    // Default message construction moved to specific log call sites (like render)
    const logMessage = message || `Operation ${label}`; // Keep label for non-render timings
    
    if (isError) {
      logger.error(`${logMessage} (Duration: ${duration}ms)`, { skipMeta: true });
    } else {
      logger.info(`${logMessage} (Duration: ${duration}ms)`, { skipMeta: true });
    }
    
    return duration;
  },
  
  // Specialized logging methods
  logQuery: (query, duration) => {
    logger.log({
      level: 'debug',
      message: `SQL (${duration}ms): ${query}`,
      type: 'sql',
      query,
      duration
    });
  },
  
  startAction: (controller, action, format = 'HTML') => { // Add format parameter
    const label = `${controller}#${action}`;
    // Log "Processing by..." instead of "Started..."
    logger.info(`Processing by ${label} as ${format}`, { skipMeta: true });
    // Still need to time the action itself for internal use if needed, but don't log completion here.
    return extendedLogger.startTimer(label); 
  },
  
  endAction: (controller, action, isError = false) => {
    // This function will now primarily just end the timer and return duration.
    // The main "Completed" log is handled elsewhere (in Router).
    const label = `${controller}#${action}`;
    const duration = extendedLogger.endTimer(label);
    
    // Optionally log errors immediately if needed, though main handler might catch it.
    if (isError) {
       logger.error(`Error during ${label}`, { skipMeta: true });
    } 
    
    return duration; // Return duration, don't log completion message.
  },
  
  // Request lifecycle logging - REMOVED (will be handled in Router)
  /*
  logRequest: (req, res, next) => {
    const requestId = Math.random().toString(36).substring(2, 10);
    const label = `request-${requestId}`;
    
    extendedLogger.startTimer(label);
    
    logger.info(`${req.method} ${req.url} - Started`, {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body
    });
    
    // Track response
    res.on('finish', () => {
      const duration = extendedLogger.endTimer(label);
      const logMethod = res.statusCode >= 400 ? 'error' : 'info';
      
      logger[logMethod](`${req.method} ${req.url} - Completed ${res.statusCode} (${duration}ms)`, {
        requestId,
        statusCode: res.statusCode,
        duration
      });
    });
    
    next();
  }
  */
};

export default extendedLogger; 