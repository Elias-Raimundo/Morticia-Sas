// Placeholders grises mientras cargan los datos (reemplazan al "Cargando..." en texto).

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200/80 ${className}`} />;
}

// Lista o tabla: filas con nombre + detalle a la izquierda y un valor a la derecha.
export function ListSkeleton({ rows = 5, className = "p-4" }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Cargando" className={`space-y-4 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className={`h-4 ${i % 3 === 0 ? "w-2/5" : i % 3 === 1 ? "w-1/2" : "w-1/3"}`} />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      ))}
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

// Gráfico: barras de distintas alturas.
export function ChartSkeleton({ className = "p-6" }: { className?: string }) {
  const heights = ["h-16", "h-28", "h-20", "h-36", "h-24", "h-32", "h-14", "h-28", "h-20", "h-36", "h-24", "h-16"];
  return (
    <div role="status" aria-label="Cargando" className={className}>
      <div className="flex h-40 items-end gap-2">
        {heights.map((h, i) => (
          <Skeleton key={i} className={`flex-1 ${h}`} />
        ))}
      </div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

// Página completa: encabezado + tarjeta con filas.
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Cargando" className="space-y-6 p-4 md:p-6">
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white">
        <ListSkeleton rows={6} className="p-5" />
      </div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

// Pantalla entera (antes de saber quién está logueado).
export function FullScreenLoader() {
  return (
    <div role="status" aria-label="Cargando" className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
