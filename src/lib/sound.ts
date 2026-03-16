export type SoundType = 'beep' | 'piano' | 'bell' | 'mute'

export const SOUND_OPTIONS: { value: SoundType; label: string }[] = [
  { value: 'beep',  label: 'ビープ音' },
  { value: 'piano', label: 'ピアノ音' },
  { value: 'bell',  label: 'ベル音'  },
  { value: 'mute',  label: 'ミュート' },
]

export function getSoundSetting(): SoundType {
  return (localStorage.getItem('pomodoro-sound') as SoundType) ?? 'beep'
}

export function setSoundSetting(type: SoundType) {
  localStorage.setItem('pomodoro-sound', type)
}

export function playTimerEndSound(type?: SoundType) {
  const soundType = type ?? getSoundSetting()
  if (soundType === 'mute') return
  try {
    const ctx = new AudioContext()
    if (soundType === 'beep') {
      ;[0, 0.4, 0.8].forEach(offset => {
        const osc = ctx.createOscillator()
        const g   = ctx.createGain()
        osc.connect(g); g.connect(ctx.destination)
        osc.frequency.value = 880; osc.type = 'sine'
        g.gain.setValueAtTime(0.5, ctx.currentTime + offset)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.35)
        osc.start(ctx.currentTime + offset)
        osc.stop(ctx.currentTime + offset + 0.35)
      })
    } else if (soundType === 'piano') {
      ;[0, 0.35, 0.7].forEach(offset => {
        const osc = ctx.createOscillator()
        const g   = ctx.createGain()
        osc.connect(g); g.connect(ctx.destination)
        osc.frequency.value = 523; osc.type = 'triangle'
        g.gain.setValueAtTime(0.35, ctx.currentTime + offset)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.5)
        osc.start(ctx.currentTime + offset)
        osc.stop(ctx.currentTime + offset + 0.5)
      })
    } else if (soundType === 'bell') {
      const osc = ctx.createOscillator()
      const g   = ctx.createGain()
      osc.connect(g); g.connect(ctx.destination)
      osc.frequency.value = 1047; osc.type = 'sine'
      g.gain.setValueAtTime(0.6, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 2.0)
    }
  } catch { /* AudioContext 非対応は無視 */ }
}

export function playStartSound() {
  if (getSoundSetting() === 'mute') return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination)
    osc.frequency.value = 440; osc.type = 'sine'
    g.gain.setValueAtTime(0.2, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  } catch { /* ignore */ }
}
