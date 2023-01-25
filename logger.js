const winston = require("winston");
const { combine, timestamp, json, errors } = winston.format;

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp(), errors({ stack: true }), json()),
    transports: [
        new winston.transports.Console(),
    ],
});

module.exports = logger;