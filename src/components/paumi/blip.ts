/*
 * El "blip" de Paumi al escribir (versión 3, paso 15.2): un pitido cortito hecho por el navegador (Web Audio),
 * sin archivos de sonido. Bajito y con un tono que cambia un poco, como en los juegos de antes.
 */

let audio: AudioContext | null = null;

export function blip(paso: number) {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const ahora = audio.currentTime;
    const tono = audio.createOscillator();
    const volumen = audio.createGain();
    tono.type = "square";
    tono.frequency.value = 620 + (paso % 3) * 45;
    volumen.gain.setValueAtTime(0.025, ahora);
    volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.045);
    tono.connect(volumen).connect(audio.destination);
    tono.start(ahora);
    tono.stop(ahora + 0.05);
  } catch {
    // Sin sonido en este navegador: no pasa nada
  }
}
