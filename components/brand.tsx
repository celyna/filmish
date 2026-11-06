"use client";

import { useEffect, useRef, type PointerEvent } from "react";

export function Wordmark() {
  return <header className="brand">
    <h1 className="wordmark">film<em>ish</em><span className="typing-cursor" aria-hidden="true" /></h1>
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
        <stop stopColor="#b77a49" stopOpacity=".8" />
        <stop offset=".2" stopColor="#754224" stopOpacity=".86" />
        <stop offset=".65" stopColor="#9b5d32" stopOpacity=".8" />
        <stop offset="1" stopColor="#60371f" stopOpacity=".9" />
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#edcfaa" stopOpacity=".82" />
        <stop offset=".5" stopColor="#fbefda" stopOpacity=".9" />
        <stop offset="1" stopColor="#d7ac78" stopOpacity=".78" />
      </linearGradient>
      <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2=".35">
        <stop stopColor="white" stopOpacity=".02" />
        <stop offset=".38" stopColor="white" stopOpacity=".02" />
        <stop offset=".5" stopColor="white" stopOpacity=".23" />
        <stop offset=".62" stopColor="white" stopOpacity=".03" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-20%" width="170%" height="160%">
        <feDropShadow dx="2" dy="5" stdDeviation="3" floodColor="#5b321d" floodOpacity=".14" />
      </filter>
    </defs>
  );
}

function Clip({ className }: { className: string }) {
  const materialId = className.includes("left") ? "left-clip-metal" : "right-clip-metal";
  return (
    <svg className={className} viewBox="0 0 20 42" fill="none" aria-hidden="true">
      <ClipMaterial id={materialId} />
      <path d="M6 3 Q10 1 14 3 L13 36 Q10 40 6 36 Z" fill={`url(#${materialId})`} stroke="#776855" strokeWidth=".85" />
      <path d="M10 4 L9 15 M9 24 L9 35 M5 20 L14 20" stroke="#776855" strokeWidth=".7" />
      <circle cx="9.5" cy="20" r="3" fill="#e8dece" stroke="#776855" strokeWidth=".8" />
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
        <FilmMaterial id={side} />
        <defs>
          <mask id={`${side}-perforations`} maskUnits="userSpaceOnUse" x="0" y="0" width="110" height="380">
            <path d="M16 15 Q55 13 94 16 L94 369 Q55 371 16 368 Z" fill="white" />
            {Array.from({ length: 20 }, (_, index) => 22 + index * 17).map(y => (
              <g key={y} fill="black">
                <rect x="21" y={y} width="6" height="9" rx="1.2" />
                <rect x="83" y={y} width="6" height="9" rx="1.2" />
              </g>
            ))}
          </mask>
        </defs>
        <g ref={film} filter={`url(#${side}-shadow)`}>
          <path d="M16 15 Q55 13 94 16 L94 369 Q55 371 16 368 Z"
            fill={`url(#${side}-base)`} mask={`url(#${side}-perforations)`} />
          <path d="M17 17 Q55 15 92 17 M17 18 L17 367 M93 19 L93 367"
            stroke="white" strokeOpacity=".3" strokeWidth=".65" />
          {Array.from({ length: frames }, (_, index) => {
            const height = 330 / frames;
            const top = 26 + index * height;
            return (
              <g key={index}>
                <rect x="33" y={top} width="44" height={height - 12}
                  fill={`url(#${side}-glass)`} stroke="#925b36" strokeOpacity=".45" strokeWidth=".65" />
                <path d={`M34 ${top + 1} H76`} stroke="white" strokeOpacity=".7" strokeWidth=".6" />
                <DoodleScene scene={side === "left" ? index + 1 : index + 4}
                  x={35} y={top + 4} width={40} height={height - 20} />
                <text x="30" y={top + height - 5} fill="#dadad2" fontSize="4.5" fontFamily="monospace"
                  letterSpacing=".8">{String(index + 1).padStart(2, "0")} ▷</text>
              </g>
            );
          })}
          <path d="M16 15 Q55 13 94 16 L94 369 Q55 371 16 368 Z"
            fill={`url(#${side}-sheen)`} mask={`url(#${side}-perforations)`} />
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
                fill="url(#center-film-glass)" stroke="#925b36" strokeOpacity=".45" strokeWidth=".8" />
              <path d="M78 78 Q176 76 275 79" stroke="white" strokeOpacity=".8" strokeWidth=".8" />
              <DoodleScene scene={0} x={83} y={81} width={187} height={99} />
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
