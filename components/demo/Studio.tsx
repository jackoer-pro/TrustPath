"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

// Filming studio for /demo: a face camera in the bottom-right corner, the demo workflow, and an in-browser recorder
// (screen + camera bubble + microphone → .webm download). Browser-only; nothing is uploaded.

const STEPS = [
  { title: "Opening", hint: "Opening slide: 66,971 complaints, up 23%." },
  { title: "Act 0 · Waking up", hint: "Good morning → Send Mum $50 → PIN." },
  { title: "Act 1 · My bank knows me", hint: "Safe to spend $295 · afford $280 · $500 AI limit · payday plan." },
  { title: "Act 2 · Shopping safely", hint: "Best deals · hidden instructions ignored · compromised agent blocked." },
  { title: "Act 3 · The card scam", hint: "Inject $3,580 card attempt → “No, it wasn't me”." },
  { title: "Act 4 · Someone else on my account", hint: "Unfamiliar device $2,500 held → secure my account." },
  { title: "Act 5 · The bank side", hint: "Session Trust timeline · case brief · lift restrictions." },
  { title: "Closing", hint: "Closing slide, then Reset demo." },
];

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function Studio() {
  const [step, setStep] = useState(0);
  const [cam, setCam] = useState<MediaStream | null>(null);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (video.current) video.current.srcObject = cam;
  }, [cam]);

  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [rec]);

  async function toggleCamera() {
    setError("");
    if (cam) {
      cam.getTracks().forEach((t) => t.stop());
      setCam(null);
      return;
    }
    try {
      setCam(await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true }));
    } catch {
      setError("Camera or microphone blocked: allow them in the address bar and try again.");
    }
  }

  async function startRecording() {
    setError("");
    let screen: MediaStream;
    try {
      // preferCurrentTab/selfBrowserSurface are Chrome hints so "This tab" is offered first.
      screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: 1920, height: 1080 },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      } as DisplayMediaStreamOptions);
    } catch {
      return; // the user cancelled the picker
    }
    // Mix the tab/system sound with the microphone into one audio track.
    const ctx = new AudioContext();
    const mix = ctx.createMediaStreamDestination();
    for (const s of [screen, cam]) if (s?.getAudioTracks().length) ctx.createMediaStreamSource(s).connect(mix);
    const stream = new MediaStream([...screen.getVideoTracks(), ...mix.stream.getAudioTracks()]);
    const type = ["video/webm;codecs=vp9,opus", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    const r = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      screen.getTracks().forEach((t) => t.stop());
      void ctx.close();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
      a.download = `trustpath-demo-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      setRec(null);
    };
    // Chrome's own "Stop sharing" bar ends the video track.
    screen.getVideoTracks()[0].onended = () => r.state !== "inactive" && r.stop();
    r.start(1000);
    setSecs(0);
    setRec(r);
  }

  return (
    <>
      <section aria-label="Workflow" className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Workflow</h2>
          <span className="text-xs text-muted tabular-nums">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <ol className="flex flex-col">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={`w-full rounded-md px-2 py-1 text-left text-[13px] leading-snug ${i === step ? "bg-navy text-white" : i < step ? "text-muted line-through decoration-1" : "text-ink hover:bg-sunken"}`}
              >
                {s.title}
                {i === step && <span className="mt-0.5 block text-xs text-white/85">{s.hint}</span>}
              </button>
            </li>
          ))}
        </ol>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>
            Next step
          </Button>
        </div>
      </section>

      <div className="flex gap-2">
        <Button size="sm" variant="secondary" className="flex-1" onClick={toggleCamera}>
          {cam ? "Camera off" : "Camera on"}
        </Button>
        {rec ? (
          <Button size="sm" variant="danger" className="flex-1" onClick={() => rec.stop()}>
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-white" /> Stop {mmss(secs)}
          </Button>
        ) : (
          <Button size="sm" variant="primary" className="flex-1" onClick={startRecording}>
            Record
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-risk-critical">{error}</p>}

      {cam && (
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          aria-label="Presenter camera"
          className="fixed right-4 bottom-4 z-[60] h-[210px] w-[280px] -scale-x-100 rounded-2xl border-4 border-white bg-ink object-cover shadow-2xl"
        />
      )}
    </>
  );
}
