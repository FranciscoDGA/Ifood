export type AlarmKind = "beep" | "chime" | "siren" | "off";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  ac: AudioContext,
  opts: { freq: number; start: number; dur: number; gain?: number; type?: OscillatorType }
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = opts.type ?? "square";
  osc.frequency.value = opts.freq;
  const peak = opts.gain ?? 0.16;
  const t0 = ac.currentTime + opts.start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
  g.gain.setValueAtTime(peak, t0 + opts.dur - 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.05);
}

/** Toca o alarme. Retorna false se o navegador bloqueou o áudio. */
export function playAlarm(kind: AlarmKind): boolean {
  if (kind === "off") return false;
  const ac = audio();
  if (!ac) return false;

  try {
    if (kind === "beep") {
      for (let i = 0; i < 3; i++) {
        tone(ac, { freq: 880, start: i * 0.22, dur: 0.15 });
      }
    } else if (kind === "chime") {
      tone(ac, { freq: 523.25, start: 0, dur: 0.28, type: "triangle", gain: 0.2 });
      tone(ac, { freq: 783.99, start: 0.16, dur: 0.32, type: "triangle", gain: 0.2 });
      tone(ac, { freq: 1046.5, start: 0.32, dur: 0.45, type: "triangle", gain: 0.18 });
    } else {
      for (let i = 0; i < 6; i++) {
        tone(ac, { freq: i % 2 ? 1046 : 784, start: i * 0.14, dur: 0.13, gain: 0.15 });
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function notifyDesktop(title: string, body: string): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icon.svg", tag: "pp-new-message" });
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermission(): Promise<string> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}
