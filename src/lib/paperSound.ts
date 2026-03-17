export function playPageTurn(direction: 'forward' | 'back' = 'forward') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const duration = 0.55

    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize
        const envelope = progress < 0.15
          ? progress / 0.15
          : Math.pow(1 - (progress - 0.15) / 0.85, 1.8)
        data[i] = (Math.random() * 2 - 1) * envelope
      }
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = direction === 'forward' ? 2800 : 2200
    bandpass.Q.value = 0.6

    const shelf = ctx.createBiquadFilter()
    shelf.type = 'highshelf'
    shelf.frequency.value = 5000
    shelf.gain.value = 4

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.04)
    gain.gain.setValueAtTime(0.35, ctx.currentTime + 0.25)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

    const thumpOsc = ctx.createOscillator()
    thumpOsc.type = 'sine'
    thumpOsc.frequency.setValueAtTime(180, ctx.currentTime)
    thumpOsc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1)
    const thumpGain = ctx.createGain()
    thumpGain.gain.setValueAtTime(0.08, ctx.currentTime)
    thumpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

    source.connect(bandpass)
    bandpass.connect(shelf)
    shelf.connect(gain)
    gain.connect(ctx.destination)
    thumpOsc.connect(thumpGain)
    thumpGain.connect(ctx.destination)

    source.start(ctx.currentTime)
    source.stop(ctx.currentTime + duration)
    thumpOsc.start(ctx.currentTime)
    thumpOsc.stop(ctx.currentTime + 0.15)

    setTimeout(() => ctx.close(), (duration + 0.1) * 1000)
  } catch {
    // Silent fail
  }
}
