import { Platform } from 'react-native';

import { redactValue } from './logRedaction';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  readonly id: number; // compteur monotone depuis le démarrage
  readonly ts: number; // Date.now()
  readonly level: LogLevel;
  readonly scope: string;
  readonly message: string;
  readonly data?: unknown; // déjà passé par redactValue
}

/**
 * Tampon circulaire borné : un journal qui grossit sans limite finit par
 * saturer la mémoire d'un téléphone. Au-delà de 500 entrées, la plus ancienne
 * est jetée.
 */
const MAX_ENTRIES = 500;

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

let entries: LogEntry[] = [];
let idCounter = 0;
let minLevel: LogLevel = __DEV__ ? 'debug' : 'info';
let sessionId: string | null = null;
let sessionStartedAt = 0;

function ensureSession(): { sessionId: string; startedAt: number } {
  if (sessionId === null) {
    const now = Date.now();
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    sessionId = `${now.toString(36)}-${randomSuffix}`;
    sessionStartedAt = now;
  }
  return { sessionId, startedAt: sessionStartedAt };
}

function getAppVersion(): string {
  try {
    // Chargement dynamique plutôt qu'import statique : `expo-constants` est un
    // module ESM qui n'est pas transformé par Jest. En test, la lecture échoue
    // proprement et on replie sur 'inconnu' ; en application (Metro), le module
    // est résolu normalement.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-constants') as {
      default?: { expoConfig?: { version?: string } };
      expoConfig?: { version?: string };
    };
    const Constants = mod.default ?? mod;
    return Constants.expoConfig?.version ?? 'inconnu';
  } catch {
    return 'inconnu';
  }
}

function getPlatformName(): string {
  try {
    return Platform.OS ?? 'inconnu';
  } catch {
    return 'inconnu';
  }
}

function serializeData(data: unknown): string {
  if (data === undefined) return '';
  try {
    return JSON.stringify(data);
  } catch {
    return '<non serialisable>';
  }
}

function formatLine(entry: LogEntry): string {
  const timestamp = new Date(entry.ts).toISOString();
  const level = entry.level.toUpperCase().padEnd(5);
  const data = serializeData(entry.data);
  const base = `${timestamp}  ${level} [${entry.scope}] ${entry.message}`;
  return data ? `${base} ${data}` : base;
}

export function log(level: LogLevel, scope: string, message: string, data?: unknown): void {
  try {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

    // Toute donnée passe par redactValue AVANT d'entrer dans le tampon : une
    // donnée sensible ne doit jamais exister en clair, même une microseconde.
    const redactedData = redactValue(data);

    const entry: LogEntry = {
      id: ++idCounter,
      ts: Date.now(),
      level,
      scope,
      message,
      ...(redactedData !== undefined ? { data: redactedData } : {}),
    };

    entries.push(entry);
    if (entries.length > MAX_ENTRIES) {
      entries.shift();
    }

    if (__DEV__) {
      const line = formatLine(entry);
      switch (level) {
        case 'debug':
          console.debug(line);
          break;
        case 'info':
          console.info(line);
          break;
        case 'warn':
          console.warn(line);
          break;
        case 'error':
        case 'fatal':
          console.error(line);
          break;
      }
    }
  } catch (failure) {
    // Un journal ne doit JAMAIS faire planter l'application qu'il observe.
    if (__DEV__) {
      console.error('[logger] échec de journalisation', failure);
    }
  }
}

export function debug(scope: string, message: string, data?: unknown): void {
  log('debug', scope, message, data);
}

export function info(scope: string, message: string, data?: unknown): void {
  log('info', scope, message, data);
}

export function warn(scope: string, message: string, data?: unknown): void {
  log('warn', scope, message, data);
}

export function error(scope: string, message: string, data?: unknown): void {
  log('error', scope, message, data);
}

export function fatal(scope: string, message: string, data?: unknown): void {
  log('fatal', scope, message, data);
}

export function getEntries(filter?: { minLevel?: LogLevel; scope?: string }): LogEntry[] {
  if (!filter) return [...entries];

  const min = filter.minLevel === undefined ? undefined : LEVEL_ORDER[filter.minLevel];
  return entries.filter((entry) => {
    if (min !== undefined && LEVEL_ORDER[entry.level] < min) return false;
    if (filter.scope !== undefined && entry.scope !== filter.scope) return false;
    return true;
  });
}

export function clear(): void {
  entries = [];
}

export function exportAsText(): string {
  const session = getSessionInfo();
  const lines: string[] = [
    `sessionId: ${session.sessionId}`,
    `version: ${session.appVersion} platform: ${session.platform}`,
    `startedAt: ${new Date(session.startedAt).toISOString()}`,
  ];
  for (const entry of entries) {
    lines.push(formatLine(entry));
  }
  return lines.join('\n');
}

export function getSessionInfo(): {
  sessionId: string;
  startedAt: number;
  appVersion: string;
  platform: string;
} {
  const session = ensureSession();
  return {
    sessionId: session.sessionId,
    startedAt: session.startedAt,
    appVersion: getAppVersion(),
    platform: getPlatformName(),
  };
}

export function setMinLevel(level: LogLevel): void {
  minLevel = level;
}

export function getMinLevel(): LogLevel {
  return minLevel;
}

/** À usage exclusif des tests : réinitialise l'état interne du journal. */
export function __resetForTests(): void {
  entries = [];
  idCounter = 0;
  minLevel = __DEV__ ? 'debug' : 'info';
  sessionId = null;
  sessionStartedAt = 0;
}
