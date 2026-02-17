"use client";

import { useEffect } from "react";

export function PwaInitializer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error("[PWA] Failed to register service worker:", error);
      }
    };

    void register();
  }, []);

  return null;
}

