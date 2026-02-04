import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    title: "Instant feedback",
    description:
      "Vite drives the renderer, so UI changes appear before you finish your thought.",
    meta: "Renderer / Vite",
  },
  {
    title: "Native shell",
    description:
      "Electron Forge packages the app with hardened defaults and a clean build path.",
    meta: "Main / Forge",
  },
  {
    title: "React 19",
    description:
      "Concurrent-ready UI with a component model that scales beyond the prototype.",
    meta: "UI / React",
  },
];

export function App() {
  const [count, setCount] = useState(0);

  let status = "Idle, waiting for input.";
  if (count > 0 && count < 4) status = "Warming up the workflow.";
  if (count >= 4) status = "Momentum achieved.";

  return (
    <main className="min-h-screen bg-background px-6 py-14 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Rune Desktop</Badge>
          <Badge variant="secondary">React 19</Badge>
          <Badge variant="outline">Shadcn UI</Badge>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Shipping a native desktop experience with shadcn/ui.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            React 19 + Electron Forge + Tailwind v4, composed with shadcn/ui
            defaults and zero custom styling overrides.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setCount((value) => value + 1)}>
            Add signal ({count})
          </Button>
          <Button variant="outline" onClick={() => setCount(0)}>
            Reset state
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">{status}</p>

        <Separator />

        <section className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.meta}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {feature.description}
              </CardContent>
            </Card>
          ))}
        </section>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>Renderer ready - Main process online</span>
          <span>Stateful UI enabled</span>
        </div>
      </div>
    </main>
  );
}
