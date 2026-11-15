"use client";

// Spoken output with the browser's built-in speech (no library, no server). Prefers an Australian English voice.
// Browsers only allow speech after a click in that page, so /demo speaks the briefing itself (it has the click).
// Never throws: if speech isn't available, the app simply stays silent.
const VOICE_KEY = "trustpath-voice";

export function voiceEnabled(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setVoiceEnabled(on: boolean) {
  try {
    localStorage.setItem(VOICE_KEY, on ? "on" : "off");
  } catch {}
  if (!on) stopSpeaking();
}

export function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || !text.trim()) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    u.voice = voices.find((v) => v.lang === "en-AU") ?? voices.find((v) => v.lang === "en-GB") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
    u.lang = u.voice?.lang ?? "en-AU";
    u.rate = 1;
    synth.speak(u);
  } catch {}
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {}
}
