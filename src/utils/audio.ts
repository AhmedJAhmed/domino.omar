/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playScoreSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Low-to-high double chirp
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {
    console.warn('Audio feedback blocked or unsupported:', e);
  }
}

export function playUndoSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // High-to-low double chirp
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.15);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {
    console.warn('Audio feedback blocked or unsupported:', e);
  }
}

export function playVictorySound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Arpeggio notes: C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.1);
      
      gain.gain.setValueAtTime(0.15, now + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.1);
      osc.stop(now + index * 0.1 + 0.45);
    });
  } catch (e) {
    console.warn('Audio feedback blocked or unsupported:', e);
  }
}

export function numberToArabicWords(num: number): string {
  if (num === 0) return 'صفر';
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];

  if (num < 20) return units[num];
  
  if (num < 100) {
    const unitPart = num % 10;
    const tenPart = Math.floor(num / 10);
    if (unitPart === 0) return tens[tenPart];
    const unitWord = units[unitPart];
    // In standard Arabic, e.g. 21 is "واحد وعشرون"
    return `${unitWord} و${tens[tenPart]}`;
  }

  if (num < 1000) {
    const hundredPart = Math.floor(num / 100);
    const rest = num % 100;
    if (rest === 0) return hundreds[hundredPart];
    return `${hundreds[hundredPart]} و${numberToArabicWords(rest)}`;
  }

  return num.toString();
}

export function speakArabic(text: string) {
  if ('speechSynthesis' in window) {
    try {
      // Find all numbers and replace them with their Arabic text words to ensure the device reads them clearly in Arabic
      const processedText = text.replace(/\d+/g, (match) => {
        return numberToArabicWords(parseInt(match, 10));
      });

      const utterance = new SpeechSynthesisUtterance(processedText);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Slightly pleasant pitch
      window.speechSynthesis.cancel(); // Stop current speech before initiating a new one
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
    }
  }
}

