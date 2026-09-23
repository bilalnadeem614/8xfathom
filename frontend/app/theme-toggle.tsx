"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

const CYCLE = ["light", "dark", "system"] as const;
const ICONS = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-6 w-6" />;

  const current = (theme as (typeof CYCLE)[number]) ?? "system";
  const Icon = ICONS[current];

  return (
    <button
      onClick={() => setTheme(CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length])}
      title={`Theme: ${current}`}
      className="flex h-6 w-6 items-center justify-center text-zinc-400 hover:text-blue-400"
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
