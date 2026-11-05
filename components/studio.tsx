"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cameras, grainEffects, settingRows, type CameraId } from "@/lib/camera";
import { changesFrom, feedbackOptions, refine, type Feedback } from "@/lib/adaptation";
import type { RecommendationResult } from "@/lib/recipe";
import { imageTypes } from "@/lib/upload";
import { resizeImage } from "@/lib/resize-image";
import { Clothesline, FrameIllustration } from "./brand";

type Photo = { file: File; url: string; width: number; height: number };

export function Studio({ visionEnabled }: { visionEnabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const request = useRef<AbortController | null>(null);
  const selection = useRef(0);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [camera, setCamera] = useState<CameraId>("x-t2");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [revised, setRevised] = useState<ReturnType<typeof refine> | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const recipe = result?.recipe;
  const settings = revised ?? recipe?.settings;
  const changes = recipe && settings ? changesFrom(recipe.settings, settings) : [];

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  useEffect(() => () => { request.current?.abort(); selection.current++; }, []);

  function goHome() {
    selection.current++;
    request.current?.abort();
    request.current = null;
    const reset = () => {
      flushSync(() => {
        setPhoto(null);
        setCamera("x-t2");
        setResult(null);
        setRevised(null);
        setError("");
        setStatus("");
        setLoading(false);
        setPreparing(false);
        setDragging(false);
      });
      window.scrollTo({ top: 0, behavior: "instant" });
      uploadButton.current?.focus({ preventScroll: true });
    };
    if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const transition = document.startViewTransition(reset);
      void transition.ready.catch(() => {});
    } else {
      reset();
    }
  }

  async function choose(file?: File) {
    if (!file) return;
    const currentSelection = ++selection.current;
    request.current?.abort();
    setLoading(false);
    setPreparing(true);
    setError("");
    setStatus("");
    setResult(null);
    setRevised(null);
    try {
      const resized = await resizeImage(file);
      if (currentSelection !== selection.current) return;
      const nextPhoto = { ...resized, url: URL.createObjectURL(resized.file) };
      const reveal = () => {
        // A newer file selection can arrive while the browser captures the old frame.
        if (currentSelection !== selection.current) {
          URL.revokeObjectURL(nextPhoto.url);
          return;
        }
        flushSync(() => { setPhoto(nextPhoto); setPreparing(false); });
      };
      if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const transition = document.startViewTransition(reveal);
        // Hidden tabs can skip the animation while still completing the state update.
        void transition.ready.catch(() => {});
        await transition.updateCallbackDone;
      } else {
        reveal();
      }
    } catch (error) {
      if (currentSelection === selection.current) {
        setError(error instanceof Error ? error.message : "The photo could not be prepared.");
      }
    } finally {
      if (currentSelection === selection.current) setPreparing(false);
    }
  }

  async function recommend() {
    if (!photo || preparing) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setResult(null);
    setRevised(null);
    setError("");
    setStatus("");
    const form = new FormData();
    form.set("photo", photo.file);
    form.set("camera", camera);
    try {
      const response = await fetch("/api/recommend", { method: "POST", body: form, signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) throw new Error(data?.error ?? "The request failed. Try again.");
      if (!controller.signal.aborted) {
        setResult(data);
        setStatus(data.recipe ? "Recipe ready." : "Analysis complete. No close match found.");
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "The request failed.");
    } finally {
      if (request.current === controller && !controller.signal.aborted) setLoading(false);
    }
  }

  function adjust(feedback: Feedback) {
    if (!settings) return;
    const next = refine(camera, settings, feedback);
    setRevised(next);
    setStatus(changesFrom(settings, next).length ? `${feedbackOptions[feedback]} applied.` : "Already at the camera’s limit.");
  }

  async function copy() {
    if (!recipe || !settings) return;
    const lines = [recipe.name, cameras[camera].name, `Original recipe by ${recipe.creator}`,
      recipe.sourceUrl, "", ...settingRows(settings).map(([key, value]) => `${key}: ${value}`),
      ...(changes.length ? ["", "filmish. adjustments", ...changes.map(change => `${change.label}: ${change.original} → ${change.value}`)] : [])];
    try {
      await navigator.clipboard.writeText(lines.filter(line => line !== null).join("\n"));
      setStatus("Recipe copied.");
    } catch {
      setStatus("Clipboard unavailable. You can select and copy the settings below.");
    }
  }

  return (
    <div className="studio">
      {photo && <button className="text-button home-button" onClick={goHome}>← Back to home</button>}
      <Clothesline />
      <input ref={input} type="file" hidden accept={imageTypes.join(",")}
        onChange={event => { choose(event.target.files?.[0]); event.target.value = ""; }} />
      {photo ? (
        <figure className="photo">
          {/* The object URL is local to this session. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} width={photo.width} height={photo.height} alt="Your inspiration photograph" />
          <figcaption><span className="eyebrow">01 / Reference</span>
            <button className="text-button" onClick={() => input.current?.click()}>Replace photo</button>
          </figcaption>
        </figure>
      ) : (
        <button ref={uploadButton} type="button" className={`upload ${dragging ? "dragging" : ""}`}
          onClick={() => input.current?.click()}
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); }}>
          <FrameIllustration />
          <span className="upload-title">Add a photograph</span>
          <span className="upload-note">JPEG, PNG or WebP · up to 30 MB · resized automatically</span>
        </button>
      )}
      {photo && (
        <section className="camera-panel" aria-label="Camera and analysis">
          <label className="eyebrow" htmlFor="camera">02 / Camera</label>
          <div className="camera-controls">
            <select id="camera" value={camera} disabled={loading || preparing}
              onChange={event => { setCamera(event.target.value as CameraId); setResult(null); setRevised(null); setError(""); setStatus(""); }}>
              {Object.entries(cameras).map(([id, profile]) => <option key={id} value={id}>{profile.name}</option>)}
            </select>
            <button className="primary" disabled={loading || preparing} onClick={recommend}>
              {loading ? "Reading photo…" : "Find a recipe"} <span aria-hidden="true">↗</span>
            </button>
          </div>
          {visionEnabled && <p className="note">Find a recipe sends a resized copy of your photo to OpenAI for vision analysis.</p>}
        </section>
      )}
      {error && <p role="alert" className="error">{error}</p>}
      {preparing && <p className="note preparing" role="status">Preparing your photo…</p>}
      {loading && <p className="note" role="status">Analyzing color and tones, then checking camera compatibility.</p>}
      {result && (
        <section className="results" aria-label="Analysis and recipe">
          <div className="eyebrow">03 / Photo notes</div>
          <ul className="palette" aria-label="Colors sampled from the photograph">
            {result.analysis.palette.map(color => <li key={color} title={color} aria-label={color} style={{ background: color }} />)}
          </ul>
          <p>{result.analysis.description}</p>
          <p className="note">{result.analysis.mode === "pixels" ? "Pixel analysis" : "Vision AI + pixel analysis"} · {result.catalog === "fixtures" ? "Local fixture catalog" : "Supabase catalog"}</p>
          <p className="note">Matching compares color and tones. Grain in your reference photo isn’t assessed yet.</p>
          {!recipe && <p className="no-match">{result.reason}</p>}
          {recipe && settings && <>
            <div className="recipe-heading">
              <div>
                <div className="eyebrow">04 / Recipe</div>
                <h2>{recipe.name}</h2>
              </div>
              <button className="secondary" onClick={copy}>Copy recipe</button>
            </div>
            <p className="note">{cameras[camera].name} · {recipe.creator}
              {recipe.sourceUrl && <> · <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">Original source ↗</a></>}
            </p>
            <p>{recipe.explanation}</p>
            <dl className="settings">
              {settingRows(settings).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
            </dl>
            {settings.dynamicRange === "DR200" && <p className="note">DR200 requires ISO 400 or higher.</p>}
            {settings.dynamicRange === "DR400" && <p className="note">DR400 requires ISO 800 or higher.</p>}
            <h3>filmish. adjustments</h3>
            {changes.length ? <ul className="changes">{changes.map(change =>
              <li key={change.label}>{change.label} <span>{change.original} → {change.value}</span></li>)}</ul>
              : <p className="note">Using the original settings.</p>}
            <div className="grain-control">
              <label htmlFor="grain-effect">Grain effect</label>
              <select id="grain-effect" value={settings.grain} onChange={event => {
                setRevised(cameras[camera].settings.parse({ ...settings, grain: event.target.value }));
                setStatus("Grain preference applied.");
              }}>
                {grainEffects.map(grain => <option key={grain} value={grain}>{grain}</option>)}
              </select>
            </div>
            <p className="note">Starts with the base recipe’s grain setting. Choose the amount you prefer.</p>
            <div className="feedback" aria-label="Refine recipe">
              {Object.entries(feedbackOptions).map(([id, label]) => <button key={id} className="secondary"
                disabled={settings.color === null && ["vivid", "muted"].includes(id)}
                onClick={() => adjust(id as Feedback)}>{label}</button>)}
              {changes.length > 0 && <button className="text-button" onClick={() => { setRevised(null); setStatus("Original settings restored."); }}>Reset</button>}
            </div>
          </>}
        </section>
      )}
      <p className="status" role="status">{status}</p>
    </div>
  );
}
