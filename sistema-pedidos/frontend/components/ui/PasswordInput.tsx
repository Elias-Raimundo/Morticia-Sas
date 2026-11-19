"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

// Campo de contraseña con el "ojito" para mostrar u ocultar lo que se escribe.
// Recibe las mismas props que un <input> (menos type).
export default function PasswordInput({ className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-gray-400 hover:text-gray-700 focus:text-gray-700 focus:outline-none"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        tabIndex={-1}
      >
        <Icon className="h-5 w-5" />
      </button>
    </div>
  );
}
