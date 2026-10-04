import { useRef, useState } from 'react'
import s from './pages.module.css'
import { useApp, snapshot, type ProgressData, type ThemePref } from '../store/app'
import { parseProgressFile, serializeProgress, ProgressFileError } from '../lib/progressFile'
import { totalXp } from '../lib/xp'
import { Sr } from '../components/sr/Sr'
import { Icon } from '../components/Icon'

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className={s.segmented} role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  )
}

export default function Settings() {
  const st = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const exportFile = () => {
    const blob = new Blob([serializeProgress(snapshot())], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `srpski-progress-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMsg({ ok: true, text: 'Файл сохранён. Открой его на другом устройстве через «Загрузить из файла».' })
  }

  const importFile = async (file: File) => {
    try {
      const data = parseProgressFile(await file.text()) as Partial<ProgressData>
      const lessons = Object.values(data.lessons ?? {}).filter((l) => l.done).length
      const ok = window.confirm(
        `В файле: ${lessons} выполненных занятий, ${totalXp(data.xpLedger ?? {})} опыта.\nТекущий прогресс на этом устройстве будет заменён. Продолжить?`,
      )
      if (!ok) return
      st.replaceAll(data)
      setMsg({ ok: true, text: 'Прогресс загружен.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ProgressFileError ? e.message : 'Не удалось прочитать файл.' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const reset = () => {
    if (window.confirm('Удалить весь прогресс на этом устройстве? Настройки останутся. Отменить это нельзя — сначала можно сохранить файл.')) {
      st.resetProgress()
      setMsg({ ok: true, text: 'Прогресс сброшен.' })
    }
  }

  return (
    <>
      <h1>Настройки</h1>

      <h2>Вид</h2>
      <div className={s.settingsGroup}>
        <div className={s.setting}>
          <div className={s.settingText}>
            Тема
            <small>«Системная» следует настройке устройства.</small>
          </div>
          <Segmented<ThemePref>
            label="Тема"
            value={st.settings.theme}
            onChange={st.setTheme}
            options={[
              ['system', 'Системная'],
              ['light', 'Светлая'],
              ['dark', 'Тёмная'],
            ]}
          />
        </div>
        <div className={s.setting}>
          <div className={s.settingText}>
            Алфавит сербского текста
            <small>
              Сейчас: <Sr>Добар дан! Ја учим српски.</Sr>
            </small>
          </div>
          <Segmented
            label="Алфавит"
            value={st.settings.script}
            onChange={st.setScript}
            options={[
              ['cyr', 'Кириллица'],
              ['lat', 'Latinica'],
            ]}
          />
        </div>
        <div className={s.setting}>
          <div className={s.settingText}>
            Обращение
            <small>
              Примеры и упражнения: <Sr>{st.settings.gender === 'm' ? 'био сам, уморан' : 'била сам, уморна'}</Sr>
            </small>
          </div>
          <Segmented
            label="Обращение"
            value={st.settings.gender ?? 'f'}
            onChange={st.setGender}
            options={[
              ['f', 'Женский род'],
              ['m', 'Мужской род'],
            ]}
          />
        </div>
      </div>

      <h2>Упражнения</h2>
      <div className={s.settingsGroup}>
        <label className={s.setting}>
          <span className={s.settingText}>
            Строгая проверка диакритики
            <small>
              Выключено: <Sr>cevapcici</Sr> вместо <Sr>ћевапчићи</Sr> засчитывается с пометкой и попадает в тетрадь ошибок. Включено: считается
              ошибкой.
            </small>
          </span>
          <input type="checkbox" className={s.switch} checked={st.settings.strictDiacritics} onChange={(e) => st.setStrictDiacritics(e.target.checked)} />
        </label>
        <label className={s.setting}>
          <span className={s.settingText}>
            Режим тренировки алфавитов
            <small>Задания показываются на другом алфавите, а отвечать нужно на выбранном выше.</small>
          </span>
          <input type="checkbox" className={s.switch} checked={st.settings.trainingMode} onChange={(e) => st.setTrainingMode(e.target.checked)} />
        </label>
      </div>

      <h2>Прогресс</h2>
      <div className={s.settingsGroup}>
        <div className={s.setting}>
          <div className={s.settingText}>
            Перенос между устройствами
            <small>Прогресс хранится только в этом браузере. Сохрани файл и загрузи его на телефоне или другом ПК.</small>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={exportFile}>
              <Icon name="download" size={18} /> Сохранить в файл
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={18} /> Загрузить из файла
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
            />
          </div>
        </div>
        <div className={s.setting}>
          <div className={s.settingText}>
            Сбросить прогресс
            <small>Занятия, упражнения, опыт, карточки и тетрадь ошибок.</small>
          </div>
          <button type="button" className="btn" onClick={reset}>
            Сбросить
          </button>
        </div>
      </div>
      {msg && (
        <p role="status" className={`${s.msg} ${msg.ok ? s.msgOk : s.msgBad}`}>
          {msg.text}
        </p>
      )}

      <h2>О данных</h2>
      <p>
        Учебник не собирает персональных данных и не использует cookies. Прогресс хранится в браузере (localStorage). Счётчик посетителей
        учитывает только факт первого визита с этого браузера.
      </p>
    </>
  )
}
