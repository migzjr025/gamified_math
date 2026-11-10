"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Critical root error caught by GlobalError:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem"
      }}>
        <div style={{
          maxWidth: "28rem",
          width: "100%",
          backgroundColor: "#0f172a",
          border: "1px solid rgba(244, 63, 94, 0.3)",
          borderRadius: "1.5rem",
          padding: "2rem",
          textAlign: "center",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
        }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "0.5rem" }}>
            Critical System Error
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "1.5rem", lineHeight: "1.5" }}>
            The application experienced an unexpected system failure. Please try reloading the page.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              background: "linear-gradient(to right, #7c3aed, #4f46e5)",
              color: "#ffffff",
              border: "none",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.875rem"
            }}
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}

