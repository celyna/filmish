"use client";

import { useEffect, useRef, type PointerEvent } from "react";

export function Wordmark() {
  return <h1 className="wordmark">filmish<span className="typing-cursor" aria-hidden="true" /></h1>;
}

function Clip({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 20 42" fill="none" aria-hidden="true">
      <path d="M6 3 Q10 1 14 3 L13 36 Q10 40 6 36 Z" fill="var(--paper)" stroke="currentColor" strokeWidth="1.1" />
      <path d="M10 4 L9 15 M9 24 L9 35 M5 20 L14 20" stroke="currentColor" strokeWidth="1" />
      <circle cx="9.5" cy="20" r="3" fill="var(--paper)" stroke="currentColor" />
    </svg>
  );
}

function DoodleScene({ scene, x, y, width, height }: {
  scene: number; x: number; y: number; width: number; height: number;
}) {
  const bounds = [
    [16, 170, 352, 280], [464, 170, 250, 300],
    [800, 155, 310, 310], [1180, 115, 340, 340],
    [16, 650, 352, 270], [460, 650, 260, 300],
    [780, 550, 350, 390], [1170, 670, 340, 260],
  ];
  const photoshoot = scene === 0;
  const [left, top, sceneWidth, sceneHeight] = photoshoot ? [100, 270, 1050, 720] : bounds[scene];
  return (
    <svg x={x} y={y} width={width} height={height}
      viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
      preserveAspectRatio="xMidYMid meet" overflow="hidden">
      <defs>
        <clipPath id={`doodle-scene-${scene}`}><rect width={sceneWidth} height={sceneHeight} /></clipPath>
      </defs>
      <g clipPath={`url(#doodle-scene-${scene})`}>
        <image href={photoshoot ? "/art/filmish-photoshoot-v4.png" : "/art/filmish-doodle-activities.png"}
          x={-left} y={-top} width={photoshoot ? 1254 : 1536} height={photoshoot ? 1254 : 1024} />
      </g>
    </svg>
  );
}

function useFilmSwing(pivotX: number, pivotY: number) {
  const film = useRef<SVGGElement>(null);
  const animation = useRef<number | null>(null);
  const previousTime = useRef<number | null>(null);
  const motion = useRef({ angle: 0, velocity: 0, target: 0 });

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    function stopMotion() {
      if (animation.current !== null) cancelAnimationFrame(animation.current);
      animation.current = null;
      previousTime.current = null;
      motion.current = { angle: 0, velocity: 0, target: 0 };
      film.current?.setAttribute("transform", `rotate(0 ${pivotX} ${pivotY})`);
    }
    reducedMotion.addEventListener("change", stopMotion);
    return () => {
      stopMotion();
      reducedMotion.removeEventListener("change", stopMotion);
    };
  }, [pivotX, pivotY]);

  function swing(time: number) {
    const elapsed = Math.min((time - (previousTime.current ?? time - 16)) / 1000, 0.032);
    previousTime.current = time;
    const state = motion.current;
    const acceleration = (state.target - state.angle) * 150 - state.velocity * 13;
    state.velocity += acceleration * elapsed;
    state.angle += state.velocity * elapsed;
    film.current?.setAttribute("transform", `rotate(${state.angle} ${pivotX} ${pivotY})`);
    if (Math.abs(state.target - state.angle) + Math.abs(state.velocity) < 0.02) {
      film.current?.setAttribute("transform", `rotate(${state.target} ${pivotX} ${pivotY})`);
      state.angle = state.target;
      state.velocity = 0;
      previousTime.current = null;
      animation.current = null;
      return;
    }
    animation.current = requestAnimationFrame(swing);
  }

  function moveTo(angle: number) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    motion.current.target = angle;
    if (animation.current === null) animation.current = requestAnimationFrame(swing);
  }

  function followPointer(event: PointerEvent<HTMLSpanElement>) {
    event.stopPropagation();
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    moveTo(position * 10);
  }

  return { film, followPointer, reset: () => moveTo(0) };
}

function HangingStrip({ side, frames }: { side: "left" | "right"; frames: number }) {
  const { film, followPointer, reset } = useFilmSwing(55, 12);
  return (
    <span className={`outer-strip outer-strip-${side}`} onPointerMove={followPointer}
      onPointerLeave={reset} onPointerCancel={reset}
      onClick={event => { event.preventDefault(); event.stopPropagation(); }}>
      <svg viewBox="0 0 110 380" preserveAspectRatio="none" fill="none">
        <g ref={film}>
          <path d="M16 15 Q55 13 94 16 L94 369 Q55 371 16 368 Z"
            fill="var(--paper)" stroke="currentColor" strokeWidth="1" />
          {Array.from({ length: 20 }, (_, index) => 22 + index * 17).map(y => (
            <g key={y} stroke="currentColor" strokeWidth=".7" opacity=".6">
              <rect x="21" y={y} width="6" height="9" rx="1.2" />
              <rect x="83" y={y} width="6" height="9" rx="1.2" />
            </g>
          ))}
          {Array.from({ length: frames }, (_, index) => {
            const height = 330 / frames;
            const top = 26 + index * height;
            return (
              <g key={index}>
                <rect x="33" y={top} width="44" height={height - 12}
                  fill={index % 2 === 0 ? "#f6f6f6" : "#fcfcfc"} stroke="currentColor" strokeWidth=".65" />
                <DoodleScene scene={side === "left" ? index + 1 : index + 4}
                  x={35} y={top + 4} width={40} height={height - 20} />
              </g>
            );
          })}
        </g>
      </svg>
    </span>
  );
}

export function Clothesline() {
  return (
      <span className="clothesline" aria-hidden="true">
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" fill="none">
          <path d="M-20 -30 Q620 105 1460 40" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
        <HangingStrip side="left" frames={3} />
        <HangingStrip side="right" frames={4} />
        <Clip className="line-clip line-clip-left" />
        <Clip className="line-clip line-clip-right" />
      </span>
  );
}

export function FrameIllustration() {
  const { film, followPointer, reset } = useFilmSwing(65, 45);
  return (
    <span className="hanging-art" aria-hidden="true" onPointerMove={followPointer}
      onPointerLeave={reset} onPointerCancel={reset}>

      <svg className="frame-illustration" viewBox="0 0 320 285" fill="none">
        <g transform="rotate(-8 65 45)">
          <g ref={film}>
            <path d="M60 52 Q174 50 291 53 L292 207 Q176 210 60 207 Z"
              fill="var(--paper)" stroke="currentColor" strokeWidth="1.15" />
            {[74, 99, 124, 149, 174, 199, 224, 249, 274].map(x => (
              <g key={x} stroke="currentColor" strokeWidth=".75" opacity=".65">
                <rect x={x} y="59" width="11" height="8" rx="1.8" />
                <rect x={x} y="193" width="11" height="8" rx="1.8" />
              </g>
            ))}
            <path d="M76 76 Q176 74 277 77 L277 184 Q176 186 76 183 Z"
              fill="#fafafa" stroke="currentColor" strokeWidth=".85" />
            <DoodleScene scene={0} x={83} y={81} width={187} height={99} />
          </g>
          <path d="M62 32 Q65 30 69 32 L68 62 Q65 65 62 62 Z"
            fill="var(--paper)" stroke="currentColor" strokeWidth="1" />
          <path d="M65 34 L65 43 M65 52 L65 60" stroke="currentColor" strokeWidth=".7" />
          <circle cx="65" cy="48" r="2.5" fill="var(--paper)" stroke="currentColor" strokeWidth=".85" />
        </g>
      </svg>
    </span>
  );
}
