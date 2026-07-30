"use client";

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/Auth.context";
import { useRouter } from "next/navigation";

interface Props {
  children: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") return null;

  return <>{children}</>;
}