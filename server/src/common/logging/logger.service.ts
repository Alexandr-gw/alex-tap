import pino from "pino";
export const loggerService = pino(process.env.NODE_ENV === "production" ? { level: "info" } : {
    level: "debug",
    transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
});
