// Один общий аудиоплеер для озвучки слов («Повтори за диктором», диктант).
// Safari и iOS разрешают play() только из нажатия — но только для элемента, который уже
// запускали по нажатию. Поэтому не создаём new Audio() на каждое слово, а меняем src у одного
// элемента: первое нажатие его «разблокирует», и дальше слова играют и после пауз.

export type PlayResult = { ok: true; ms: number } | { ok: false; error: string }

let el: HTMLAudioElement | null = null
let cancel: (() => void) | null = null
let owner: (() => void) | null = null

/**
 * Занять плеер: предыдущий владелец (другое упражнение на странице) получает вызов onLost
 * и прекращает свой цикл «слушай — повтори», чтобы упражнения не перебивали друг друга.
 */
export function claimPlayer(onLost: () => void) {
  const prev = owner
  owner = onLost
  if (prev && prev !== onLost) prev()
}

/** Освободить плеер, если он всё ещё наш. */
export function releasePlayer(onLost: () => void) {
  if (owner === onLost) owner = null
}

function media() {
  if (!el) {
    el = new Audio()
    el.preload = 'auto'
  }
  return el
}

/** Проигрывает файл до конца. Возвращает длительность или причину ошибки ('stopped' — остановлено). */
export function playUrl(url: string, rate = 1): Promise<PlayResult> {
  const a = media()
  cancel?.()
  return new Promise((resolve) => {
    let done = false
    const finish = (r: PlayResult) => {
      if (done) return
      done = true
      a.onended = null
      a.onerror = null
      cancel = null
      resolve(r)
    }
    cancel = () => finish({ ok: false, error: 'stopped' })
    const t0 = performance.now()
    a.onended = () => finish({ ok: true, ms: performance.now() - t0 })
    a.onerror = () => finish({ ok: false, error: `файл не загрузился (код ${a.error?.code ?? '?'})` })
    // При смене src скорость сбрасывается в defaultPlaybackRate — задаём обе.
    a.defaultPlaybackRate = rate
    a.src = url
    a.playbackRate = rate
    a.play().catch((e: unknown) => finish({ ok: false, error: e instanceof Error ? e.name : String(e) }))
  })
}

export function stopPlayback() {
  el?.pause()
  cancel?.()
}

/** Понятное ученику объяснение ошибки воспроизведения. */
export function playErrorText(error: string) {
  if (error === 'NotAllowedError') return 'Браузер не дал включить звук. Нажми на слово ещё раз.'
  if (error === 'NotSupportedError') return 'Браузер не смог открыть аудиофайл. Попробуй другой браузер.'
  return `Звук не включился: ${error}. Проверь интернет и громкость и нажми ещё раз.`
}
