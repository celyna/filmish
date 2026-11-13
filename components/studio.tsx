"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { PhotoRecommendation } from "@/lib/open-fuji";
import { imageTypes } from "@/lib/upload";
import { resizeImage } from "@/lib/resize-image";
import { Clothesline, FrameIllustration } from "./brand";

type Photo = { file: File; url: string; width: number; height: number };

export function Studio() {
  const input = useRef<HTMLInputElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const request = useRef<AbortController | null>(null);
  const selection = useRef(0);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [result, setResult] = useState<PhotoRecommendation | null>(null);
  const [activeRecipe, setActiveRecipe] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const recipe = result?.recipes[activeRecipe];

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  useEffect(() => () => { request.current?.abort(); selection.current++; }, []);

  function goHome() {
    selection.current++;
    request.current?.abort();
    request.current = null;
    const reset = () => {
      flushSync(() => {
        setPhoto(null);
        setResult(null);
        setActiveRecipe(0);
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
    request.current = null;
    setLoading(false);
    setPreparing(true);
    setError("");
    setStatus("");
    setResult(null);
    setActiveRecipe(0);
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
      if (currentSelection === selection.current) void recommend(nextPhoto);
    } catch (error) {
      if (currentSelection === selection.current) {
        setError(error instanceof Error ? error.message : "The photo could not be prepared.");
      }
    } finally {
      if (currentSelection === selection.current) setPreparing(false);
    }
  }

  async function recommend(reference: Photo) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setResult(null);
    setActiveRecipe(0);
    setError("");
    setStatus("");
    const form = new FormData();
    form.set("photo", reference.file);
    try {
      const response = await fetch("/api/recommend", { method: "POST", body: form, signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) throw new Error(data?.error ?? "The request failed. Try again.");
      if (!controller.signal.aborted) {
        setResult(data);
        setStatus(data.recipes.length ? "Recipe ready." : "Analysis complete. No close match found.");
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "The request failed.");
    } finally {
      if (request.current === controller && !controller.signal.aborted) setLoading(false);
    }
  }

  async function copy() {
    if (!recipe) return;
    const lines = [recipe.name, recipe.generation, `Original recipe by ${recipe.creator}`,
      recipe.sourceUrl, "", ...recipe.settings.map(([key, value]) => `${key}: ${value}`)];
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
      {error && <p role="alert" className="error">{error}</p>}
      {error && photo && !preparing && !loading && <button className="secondary" onClick={() => recommend(photo)}>Try again</button>}
      {preparing && <p className="note preparing" role="status">Preparing your photo…</p>}
      {loading && <p className="note" role="status">Reading your photo and finding recipes…</p>}
      {result && (
        <section className="results" aria-label="Analysis and recipe">
          <div className="eyebrow">Photo notes</div>
          <ul className="palette" aria-label="Colors sampled from the photograph">
            {result.analysis.palette.map(color => <li key={color} title={color} aria-label={color} style={{ background: color }} />)}
          </ul>
          <p>{result.analysis.description}</p>
          <p className="note">Ranked against {result.catalogSize} Open Fuji Recipes by estimated color and tones.</p>
          {!recipe && <p className="no-match">No recipes match this photo’s color mode.</p>}
          {recipe && <>
            <div className="feedback" aria-label="Recipe matches">
              {result.recipes.map((match, index) => (
                <button key={match.id} className="secondary" aria-pressed={index === activeRecipe}
                  onClick={() => { setActiveRecipe(index); setStatus(""); }}>{match.name}</button>
              ))}
            </div>
            <div className="recipe-heading">
              <div>
                <div className="eyebrow">{activeRecipe === 0 ? "Best match" : "Alternative match"}</div>
                <h2>{recipe.name}</h2>
              </div>
              <button className="secondary" onClick={copy}>Copy recipe</button>
            </div>
            <p className="note">{recipe.generation} · {recipe.creator} · <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">Catalog entry ↗</a></p>
            <p className="note">Check your camera’s settings before applying this recipe.</p>
            <dl className="settings">
              {recipe.settings.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
            </dl>
          </>}
        </section>
      )}
      <p className="status" role="status">{status}</p>
    </div>
  );
}
