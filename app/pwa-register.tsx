"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    };
    addEventListener("load", register, { once: true });
    return () => removeEventListener("load", register);
  }, []);

  return null;
}
