"use client";

import { useEffect, useRef, type PointerEvent } from "react";

export function Wordmark() {
  return <header className="brand">
    <h1 className="wordmark">film<em>ish</em></h1>
    <p className="tagline">turn photo inspo into a fujifilm recipe</p>
  </header>;
}

function ClipMaterial({ id }: { id: string }) {
  return <defs>
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      <stop stopColor="#a7967e" />
      <stop offset=".4" stopColor="#f4eee4" />
      <stop offset=".7" stopColor="#d9cbb6" />
      <stop offset="1" stopColor="#96836b" />
    </linearGradient>
  </defs>;
}

function FilmMaterial({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-base`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#303030" stopOpacity=".98" />
        <stop offset=".2" stopColor="#111111" stopOpacity=".98" />
        <stop offset=".65" stopColor="#242424" stopOpacity=".98" />
        <stop offset="1" stopColor="#080808" stopOpacity=".99" />
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#d5d5d5" stopOpacity=".82" />
        <stop offset=".5" stopColor="#f5f5f5" stopOpacity=".9" />
        <stop offset="1" stopColor="#bababa" stopOpacity=".78" />
      </linearGradient>
      <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2=".35">
        <stop stopColor="white" stopOpacity=".02" />
        <stop offset=".38" stopColor="white" stopOpacity=".02" />
        <stop offset=".5" stopColor="white" stopOpacity=".23" />
        <stop offset=".62" stopColor="white" stopOpacity=".03" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-20%" width="170%" height="160%">
        <feDropShadow dx="2" dy="5" stdDeviation="3" floodColor="#151515" floodOpacity=".14" />
      </filter>
    </defs>
  );
}

function DoodleScene({ x, y, width, height }: {
  x: number; y: number; width: number; height: number;
}) {
  const [left, top, sceneWidth, sceneHeight] = [100, 270, 1050, 720];
  return (
    <svg x={x} y={y} width={width} height={height}
      viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
      preserveAspectRatio="xMidYMid meet" overflow="hidden">
      <defs>
        <clipPath id="center-doodle-scene"><rect width={sceneWidth} height={sceneHeight} /></clipPath>
      </defs>
      <g clipPath="url(#center-doodle-scene)">
        <image href="/art/filmish-photoshoot-v4.png"
          x={-left} y={-top} width="1254" height="1254" />
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

export function Clothesline() {
  return (
      <span className="clothesline" aria-hidden="true">
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" fill="none">
          <path d="M-20 -30 Q620 105 1460 40" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
      </span>
  );
}

export function FrameIllustration() {
  const { film, followPointer, reset } = useFilmSwing(110, 45);
  return (
    <span className="hanging-art" aria-hidden="true" onPointerMove={followPointer}
      onPointerLeave={reset} onPointerCancel={reset}>

      <svg className="frame-illustration" viewBox="0 0 320 285" fill="none">
        <FilmMaterial id="center-film" />
        <ClipMaterial id="center-clip-metal" />
        <defs>
          <mask id="center-film-perforations" maskUnits="userSpaceOnUse" x="50" y="40" width="255" height="180">
            <path d="M60 52 Q174 50 291 53 L292 207 Q176 210 60 207 Z" fill="white" />
            {[74, 99, 124, 149, 174, 199, 224, 249, 274].map(x => (
              <g key={x} fill="black">
                <rect x={x} y="59" width="11" height="8" rx="1.8" />
                <rect x={x} y="193" width="11" height="8" rx="1.8" />
              </g>
            ))}
          </mask>
        </defs>
        <g className="center-film-placement">
          <g transform="rotate(-8 110 45)">
            <g ref={film} filter="url(#center-film-shadow)">
              <path d="M60 52 Q174 50 291 53 L292 207 Q176 210 60 207 Z"
                fill="url(#center-film-base)" mask="url(#center-film-perforations)" />
              <path d="M62 54 Q174 52 289 55 M62 55 L62 204 M290 56 L291 205"
                stroke="white" strokeOpacity=".34" strokeWidth=".75" />
              <path d="M76 76 Q176 74 277 77 L277 184 Q176 186 76 183 Z"
                fill="url(#center-film-glass)" stroke="#5a5a5a" strokeOpacity=".45" strokeWidth=".8" />
              <path d="M78 78 Q176 76 275 79" stroke="white" strokeOpacity=".8" strokeWidth=".8" />
              <DoodleScene x={83} y={81} width={187} height={99} />
              <path d="M60 52 Q174 50 291 53 L292 207 Q176 210 60 207 Z"
                fill="url(#center-film-sheen)" mask="url(#center-film-perforations)" />
              <text x="64" y="133" transform="rotate(-90 64 133)" fill="#dadad2"
                fontSize="4" fontFamily="monospace" letterSpacing="1.1">filmish 35</text>
            </g>
            <path d="M107 32 Q110 30 114 32 L113 76 Q110 79 107 76 Z"
              fill="url(#center-clip-metal)" stroke="#776855" strokeWidth=".85" />
            <path d="M110 34 L110 43 M110 52 L110 74" stroke="#776855" strokeWidth=".7" />
            <circle cx="110" cy="48" r="2.5" fill="#e8dece" stroke="#776855" strokeWidth=".8" />
          </g>
        </g>
      </svg>
    </span>
  );
}
