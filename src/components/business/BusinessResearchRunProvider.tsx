'use client';

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'levitateos.active-research-reports.v1';
const REGISTER_EVENT = 'business-research-runner-register';
const UNREGISTER_EVENT = 'business-research-runner-unregister';
const REFRESH_EVENT = 'business-research-runner-refresh';

type ActiveRunState = Record<string, { nextAttemptAt: number }>;

function readStoredState(): ActiveRunState {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as ActiveRunState;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function writeStoredState(nextState: ActiveRunState) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // Ignore storage write failures in private or restricted browser contexts.
  }
}

export function getResearchRunNextAttemptAt(reportId: string) {
  const state = readStoredState();
  return state[reportId]?.nextAttemptAt ?? null;
}

function extractRetryDelayMs(payload: unknown, fallbackMs = 65000) {
  if (payload && typeof payload === 'object' && 'retryAfterSeconds' in payload) {
    const parsed = Number((payload as { retryAfterSeconds?: unknown }).retryAfterSeconds);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed * 1000;
    }
  }

  if (payload && typeof payload === 'object' && 'error' in payload) {
    const message = String((payload as { error?: unknown }).error ?? '');
    const matched = Number(message.match(/try again in\s+(\d+)/i)?.[1] ?? '');
    if (Number.isFinite(matched) && matched > 0) {
      return matched * 1000;
    }
  }

  return fallbackMs;
}

export function registerResearchRun(reportId: string, delayMs = 0) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(REGISTER_EVENT, {
      detail: {
        reportId,
        delayMs,
      },
    })
  );
}

export function unregisterResearchRun(reportId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(UNREGISTER_EVENT, {
      detail: {
        reportId,
      },
    })
  );
}

export default function BusinessResearchRunProvider() {
  const [activeRuns, setActiveRuns] = useState<ActiveRunState>(() => readStoredState());
  const activeRunsRef = useRef<ActiveRunState>({});
  const runningReportRef = useRef<string | null>(null);

  useEffect(() => {
    activeRunsRef.current = activeRuns;
    writeStoredState(activeRuns);
  }, [activeRuns]);

  useEffect(() => {
    function onRegister(event: Event) {
      const detail = (event as CustomEvent<{ reportId?: string; delayMs?: number }>).detail;
      const reportId = String(detail?.reportId ?? '').trim();
      if (!reportId) {
        return;
      }

      const delayMs = Math.max(Number(detail?.delayMs ?? 0), 0);
      setActiveRuns((current) => ({
        ...current,
        [reportId]: {
          nextAttemptAt: Date.now() + delayMs,
        },
      }));
    }

    function onUnregister(event: Event) {
      const detail = (event as CustomEvent<{ reportId?: string }>).detail;
      const reportId = String(detail?.reportId ?? '').trim();
      if (!reportId) {
        return;
      }

      setActiveRuns((current) => {
        const next = { ...current };
        delete next[reportId];
        return next;
      });
    }

    window.addEventListener(REGISTER_EVENT, onRegister);
    window.addEventListener(UNREGISTER_EVENT, onUnregister);

    return () => {
      window.removeEventListener(REGISTER_EVENT, onRegister);
      window.removeEventListener(UNREGISTER_EVENT, onUnregister);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (runningReportRef.current) {
        return;
      }

      const dueEntry = Object.entries(activeRunsRef.current)
        .sort((left, right) => left[1].nextAttemptAt - right[1].nextAttemptAt)
        .find(([, value]) => value.nextAttemptAt <= Date.now());

      if (!dueEntry) {
        return;
      }

      const [reportId] = dueEntry;
      runningReportRef.current = reportId;

      try {
        const reportResponse = await fetch(`/api/business/research/reports/${reportId}`, {
          cache: 'no-store',
        });
        const reportPayload = await reportResponse.json().catch(() => null);

        if (!reportResponse.ok || !reportPayload?.success) {
          setActiveRuns((current) => {
            const next = { ...current };
            delete next[reportId];
            return next;
          });
          return;
        }

        const report = reportPayload.data as {
          status?: string;
          selectedModules?: string[];
          moduleResults?: Record<string, { status?: string }>;
        };

        const selectedModules = Array.isArray(report?.selectedModules) ? report.selectedModules : [];
        const nextModuleId = selectedModules.find((moduleId) => {
          const status = report?.moduleResults?.[moduleId]?.status;
          return status === 'pending' || status === 'loading';
        });

        if (!nextModuleId || report?.status === 'complete' || report?.status === 'archived') {
          setActiveRuns((current) => {
            const next = { ...current };
            delete next[reportId];
            return next;
          });
          window.dispatchEvent(new CustomEvent(REFRESH_EVENT, { detail: { reportId } }));
          return;
        }

        const moduleResponse = await fetch(`/api/business/research/reports/${reportId}/modules/${nextModuleId}`, {
          method: 'POST',
        });
        const modulePayload = await moduleResponse.json().catch(() => null);

        if (moduleResponse.status === 202 || modulePayload?.queued) {
          const retryDelayMs = extractRetryDelayMs(modulePayload);
          setActiveRuns((current) => ({
            ...current,
            [reportId]: {
              nextAttemptAt: Date.now() + retryDelayMs + 4000,
            },
          }));
          window.dispatchEvent(new CustomEvent(REFRESH_EVENT, { detail: { reportId } }));
          return;
        }

        if (!moduleResponse.ok || !modulePayload?.success) {
          setActiveRuns((current) => ({
            ...current,
            [reportId]: {
              nextAttemptAt: Date.now() + 20000,
            },
          }));
          window.dispatchEvent(new CustomEvent(REFRESH_EVENT, { detail: { reportId } }));
          return;
        }

        const nextStatus = String(modulePayload?.report?.reportStatus ?? 'generating');
        if (nextStatus === 'complete' || nextStatus === 'partial' || nextStatus === 'archived') {
          setActiveRuns((current) => {
            const next = { ...current };
            delete next[reportId];
            return next;
          });
        } else {
          setActiveRuns((current) => ({
            ...current,
            [reportId]: {
              nextAttemptAt: Date.now() + 45000,
            },
          }));
        }

        window.dispatchEvent(new CustomEvent(REFRESH_EVENT, { detail: { reportId } }));
      } catch {
        setActiveRuns((current) => ({
          ...current,
          [reportId]: {
            nextAttemptAt: Date.now() + 20000,
          },
        }));
      } finally {
        runningReportRef.current = null;
      }
    }, 1500);

    return () => window.clearInterval(interval);
  }, []);

  return null;
}
