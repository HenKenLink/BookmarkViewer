import { LogLevel, Setting } from "./types";
import { SETTINGS_KEY } from "../viewer/consts";

export type LogEntry = {
    timestamp: number;
    level: LogLevel;
    message: string;
    context?: any;
};

class ExtensionLogger {
    private currentLevel: LogLevel = "info";
    private logs: LogEntry[] = [];
    private readonly MAX_LOGS = 200;

    // Level precedence: none (0) < error (1) < warn (2) < info (3) < debug (4)
    private readonly levelWeights: Record<LogLevel, number> = {
        none: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
    };

    constructor() {
        this.init();
    }

    private async init() {
        try {
            if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
                // Initial load
                const result = await browser.storage.local.get(SETTINGS_KEY);
                const settings = result[SETTINGS_KEY] as Setting;
                if (settings && settings.logLevel) {
                    this.currentLevel = settings.logLevel;
                }

                // Listen for changes
                browser.storage.onChanged.addListener((changes, areaName) => {
                    if (areaName === "local" && changes[SETTINGS_KEY]) {
                        const newSettings = changes[SETTINGS_KEY].newValue as Setting;
                        if (newSettings && newSettings.logLevel) {
                            this.currentLevel = newSettings.logLevel;
                        }
                    }
                });
            }
        } catch (e) {
            // Fallback or ignore if not in an extension context
            console.warn("Logger: Could not bind to extension storage", e);
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return this.levelWeights[level] <= this.levelWeights[this.currentLevel];
    }

    private addLog(level: LogLevel, ...args: any[]) {
        if (!this.shouldLog(level)) return;

        // Perform the actual console logging
        switch (level) {
            case "error":
                console.error(...args);
                break;
            case "warn":
                console.warn(...args);
                break;
            case "info":
                console.info(...args);
                break;
            case "debug":
                console.debug(...args);
                break;
        }

        // Format for internal storage
        const message = args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ");

        // Push to log array
        this.logs.push({
            timestamp: Date.now(),
            level,
            message,
        });

        // Trim logs if they exceed max length
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift();
        }
    }

    public error(...args: any[]) {
        this.addLog("error", ...args);
    }

    public warn(...args: any[]) {
        this.addLog("warn", ...args);
    }

    public info(...args: any[]) {
        this.addLog("info", ...args);
    }

    public debug(...args: any[]) {
        this.addLog("debug", ...args);
    }

    public getLogs(): LogEntry[] {
        return [...this.logs];
    }

    public clearLogs() {
        this.logs = [];
    }
}

export const logger = new ExtensionLogger();
