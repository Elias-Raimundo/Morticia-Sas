"use client";

import { useAuth } from "@/context/Auth.context";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface Props {
  children: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    if (user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user]);

  if (!user || user.role !== "admin") return null;

  return <>{children}</>;
}