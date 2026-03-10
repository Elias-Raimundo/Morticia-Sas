"use client";

import { useAuth } from "@/context/Auth.context";

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <h1 className="font-semibold text-lg">
        Panel
      </h1>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.role}
        </span>

        <button
          onClick={logout}
          className="text-sm bg-black text-white px-3 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </header>
  );
}