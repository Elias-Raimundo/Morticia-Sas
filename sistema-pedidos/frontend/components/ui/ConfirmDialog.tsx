"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

// Reemplazo del window.confirm del navegador, con el estilo del sistema.
// Uso:
//   const confirmDialog = useConfirm();
//   if (!(await confirmDialog({ title: "¿Eliminar?", message: "...", danger: true }))) return;

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean; // botón rojo, para acciones que borran o anulan
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // si había uno abierto, se resuelve como cancelado
    resolverRef.current?.(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    if (!options) return;
    confirmButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [options, finish]);

  const danger = options?.danger ?? false;
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {options && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => finish(false)} />

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-[modalIn_0.15s_ease-out]"
          >
            <div className="flex gap-4 p-6">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  danger ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 id="confirm-title" className="text-base font-semibold text-gray-900">
                  {options.title}
                </h2>
                {options.message && (
                  <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{options.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => finish(false)}
              >
                {options.cancelText ?? "Cancelar"}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  danger
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-amber-500 text-gray-950 hover:bg-amber-600"
                }`}
                onClick={() => finish(true)}
              >
                {options.confirmText ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  return ctx;
}
