import { readFileSync } from "node:fs";
import os from "node:os";

import { prisma } from "@/src/lib/prisma";

export type HealthLevel = "ok" | "warning" | "critical";

export type HealthMetric = {
  key: string;
  label: string;
  value: string;
  detail: string;
  level: HealthLevel;
  percent: number | null;
};

export type PlatformHealth = {
  level: HealthLevel;
  checkedAt: string;
  metrics: HealthMetric[];
};

function level(value: number, warning: number, critical: number): HealthLevel {
  return value >= critical ? "critical" : value >= warning ? "warning" : "ok";
}

function worst(levels: HealthLevel[]): HealthLevel {
  return levels.includes("critical") ? "critical" : levels.includes("warning") ? "warning" : "ok";
}

// os.freemem() ignores reclaimable cache; MemAvailable is the real headroom on Linux.
function availableMemory() {
  try {
    const match = /MemAvailable:\s+(\d+) kB/.exec(readFileSync("/proc/meminfo", "utf8"));
    if (match) return Number(match[1]) * 1024;
  } catch {
    // Not Linux: fall back to freemem.
  }
  return os.freemem();
}

function megabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days > 0 ? `${days} d ${hours} h` : hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  const metrics: HealthMetric[] = [];

  const started = performance.now();
  let databaseUp = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseUp = false;
  }
  const latency = Math.round(performance.now() - started);
  metrics.push({
    key: "database",
    label: "Base de datos",
    value: databaseUp ? `${latency} ms` : "Sin conexión",
    detail: "Tiempo de respuesta",
    level: databaseUp ? level(latency, 200, 1000) : "critical",
    percent: databaseUp ? Math.min(100, (latency / 1000) * 100) : 100
  });

  if (databaseUp) {
    try {
      const [connections] = await prisma.$queryRaw<Array<{ used: number; max: number; size: bigint }>>`
        SELECT (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database()) AS used,
               current_setting('max_connections')::int AS max,
               pg_database_size(current_database()) AS size`;
      const percent = (connections.used / connections.max) * 100;
      metrics.push({
        key: "connections",
        label: "Conexiones a la base de datos",
        value: `${connections.used} / ${connections.max}`,
        detail: `${percent.toFixed(0)}% del límite`,
        level: level(percent, 70, 90),
        percent
      });
      metrics.push({ key: "size", label: "Tamaño de la base de datos", value: megabytes(Number(connections.size)), detail: "Almacenamiento usado", level: "ok", percent: null });
    } catch {
      metrics.push({ key: "connections", label: "Conexiones a la base de datos", value: "No disponible", detail: "Sin permisos para consultar", level: "warning", percent: null });
    }
  }

  const memory = process.memoryUsage();
  const heapLimit = Number(process.env.NODE_HEAP_LIMIT_MB) * 1024 * 1024 || 4096 * 1024 * 1024;
  const heapPercent = (memory.heapUsed / heapLimit) * 100;
  metrics.push({ key: "memory", label: "Memoria de la app", value: megabytes(memory.rss), detail: `Heap ${megabytes(memory.heapUsed)} (${heapPercent.toFixed(0)}% del límite estimado)`, level: level(heapPercent, 70, 90), percent: heapPercent });

  const usedMemory = os.totalmem() - availableMemory();
  const systemMemoryPercent = (usedMemory / os.totalmem()) * 100;
  metrics.push({ key: "system-memory", label: "Memoria del servidor", value: `${systemMemoryPercent.toFixed(0)}%`, detail: `${megabytes(usedMemory)} de ${megabytes(os.totalmem())}`, level: level(systemMemoryPercent, 80, 92), percent: systemMemoryPercent });

  const cpus = os.cpus().length || 1;
  const loadPercent = (os.loadavg()[0] / cpus) * 100;
  metrics.push({ key: "cpu", label: "Carga del CPU", value: `${loadPercent.toFixed(0)}%`, detail: `${os.loadavg()[0].toFixed(2)} promedio 1 min · ${cpus} núcleos`, level: level(loadPercent, 70, 100), percent: Math.min(100, loadPercent) });

  metrics.push({ key: "uptime", label: "Tiempo en línea", value: formatUptime(process.uptime()), detail: "Desde el último reinicio de la app", level: "ok", percent: null });

  return { level: worst(metrics.map((metric) => metric.level)), checkedAt: new Date().toISOString(), metrics };
}
