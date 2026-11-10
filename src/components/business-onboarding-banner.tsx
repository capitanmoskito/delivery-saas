"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { TenantOnboardingProgress } from "@/src/modules/tenants/tenant-onboarding";

type Props = {
  progress: TenantOnboardingProgress;
  trialEndsAt: Date | null;
  tenantStatus: string;
};

export default function BusinessOnboardingBanner({ progress, trialEndsAt, tenantStatus }: Props) {
  const [currentProgress, setCurrentProgress] = useState(progress);

  useEffect(() => {
    if (currentProgress.complete) return;

    let active = true;
    let requestInFlight = false;

    async function refreshProgress() {
      if (!active || requestInFlight || document.visibilityState === "hidden") return;
      requestInFlight = true;

      try {
        const response = await fetch("/api/business/onboarding-progress", { cache: "no-store" });
        const data: { success?: boolean; progress?: TenantOnboardingProgress; message?: string } =
          await response.json();

        if (!response.ok || !data.success || !data.progress) {
          throw new Error(data.message || "No se pudo actualizar el progreso del registro.");
        }

        if (active) setCurrentProgress(data.progress);
      } catch (error) {
        console.error("Business onboarding progress refresh error:", error);
      } finally {
        requestInFlight = false;
      }
    }

    const initialRequest = window.setTimeout(() => void refreshProgress(), 0);
    const interval = window.setInterval(() => void refreshProgress(), 5_000);
    window.addEventListener("focus", refreshProgress);
    document.addEventListener("visibilitychange", refreshProgress);

    return () => {
      active = false;
      window.clearTimeout(initialRequest);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshProgress);
      document.removeEventListener("visibilitychange", refreshProgress);
    };
  }, [currentProgress.complete]);

  if (currentProgress.complete) return null;

  const now = new Date();
  const trialExpired =
    trialEndsAt !== null &&
    trialEndsAt.getTime() <= now.getTime() &&
    (tenantStatus === "trial" || tenantStatus === "suspended");
  const daysRemaining =
    trialEndsAt && !trialExpired ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000) : null;
  const showTrialWarning = trialExpired || (daysRemaining !== null && daysRemaining <= 3);
  const missingSections = currentProgress.sections.filter((section) => !section.complete);

  return (
    <aside
      aria-label="Progreso de configuración del negocio"
      className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50/95 shadow-sm backdrop-blur"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {showTrialWarning ? (
              <AlertTriangle size={21} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={21} className="mt-0.5 shrink-0 text-[#d95d39]" aria-hidden="true" />
            )}
            <div>
              <p className="font-bold text-[#2b2118]">
                {trialExpired
                  ? "Tu negocio está suspendido y no aparece en el feed"
                  : `Completa el registro para publicar tu negocio${daysRemaining !== null && daysRemaining <= 3 ? `: quedan ${daysRemaining} ${daysRemaining === 1 ? "día" : "días"} de prueba` : ""}`}
              </p>
              <p className="mt-1 text-sm text-stone-700">
                {trialExpired
                  ? "No completaste el perfil durante los 15 días de prueba. Conservamos tus datos; contacta a soporte al terminar la configuración para solicitar la reactivación."
                  : "Tu negocio no se mostrará a los clientes hasta completar todas las secciones. Si termina tu prueba sin completarlas, el tenant se suspenderá y seguirá oculto del feed."}
              </p>
            </div>
          </div>
          <p className="shrink-0 text-2xl font-extrabold text-[#a94327]" aria-label={`${currentProgress.percentage}% completado`}>
            {currentProgress.percentage}%
          </p>
        </div>

        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-amber-200"
          role="progressbar"
          aria-valuenow={currentProgress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso del registro"
        >
          <div
            className="h-full rounded-full bg-[#d95d39] transition-[width]"
            style={{ width: `${currentProgress.percentage}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {missingSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="font-medium text-[#8f351e] underline decoration-[#d95d39]/40 underline-offset-4 hover:text-[#632411]"
            >
              {section.label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
