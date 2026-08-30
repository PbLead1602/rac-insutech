"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "error-callback": () => void; theme?: "light" | "dark" }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type TurnstileProps = { onVerify: (token: string) => void };

/** Cloudflare's script is only loaded when a site key exists. */
export function TurnstileWidget({ onVerify }: TurnstileProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!siteKey || !container.current) return;
    let widgetId: string | undefined;
    let mounted = true;
    const render = () => {
      if (!mounted || !container.current || !window.turnstile) return;
      widgetId = window.turnstile.render(container.current, {
        sitekey: siteKey,
        theme: "light",
        callback: onVerify,
        "error-callback": () => setError(true),
      });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-rac-turnstile="true"]');
    if (window.turnstile) render();
    else if (existing) existing.addEventListener("load", render, { once: true });
    else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.racTurnstile = "true";
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      mounted = false;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, onVerify]);

  if (!siteKey) return <p className="turnstile-fallback">Development mode: spam verification is safely mocked until a Turnstile key is set.</p>;
  return <div className="turnstile-wrap"><div ref={container} />{error && <p>Spam verification could not load. Please refresh and try again.</p>}</div>;
}
