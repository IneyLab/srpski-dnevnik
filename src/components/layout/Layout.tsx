import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import s from './layout.module.css'
import { Icon } from '../Icon'
import { useApp, type ThemePref } from '../../store/app'
import { isStorageAvailable } from '../../lib/storage'
import { toScript } from '../../lib/translit'
import { VisitorCounter } from './VisitorCounter'
import { Sr } from '../sr/Sr'

const THEME_NEXT: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_LABEL: Record<ThemePref, string> = { system: 'Системная', light: 'Светлая', dark: 'Тёмная' }
const THEME_ICON: Record<ThemePref, string> = { system: 'system', light: 'sun', dark: 'moon' }

export function ThemeToggle() {
  const theme = useApp((st) => st.settings.theme)
  const setTheme = useApp((st) => st.setTheme)
  return (
    <button
      type="button"
      className={s.toggle}
      onClick={() => setTheme(THEME_NEXT[theme])}
      title={`Тема: ${THEME_LABEL[theme]}. Нажми, чтобы сменить`}
      aria-label={`Тема: ${THEME_LABEL[theme]}. Сменить тему`}
    >
      <Icon name={THEME_ICON[theme]} />
    </button>
  )
}

export function ScriptToggle() {
  const script = useApp((st) => st.settings.script)
  const setScript = useApp((st) => st.setScript)
  const next = script === 'cyr' ? 'lat' : 'cyr'
  return (
    <button
      type="button"
      className={`${s.toggle} ${s.scriptToggle}`}
      onClick={() => setScript(next)}
      aria-label={`Алфавит сербского текста: ${script === 'cyr' ? 'кириллица' : 'латиница'}. Переключить на ${next === 'cyr' ? 'кириллицу' : 'латиницу'}`}
      title="Кириллица ↔ латиница для всего сербского текста"
    >
      <span aria-hidden="true" className={script === 'cyr' ? s.on : undefined}>
        Ћ
      </span>
      <span aria-hidden="true">/</span>
      <span aria-hidden="true" className={script === 'lat' ? s.on : undefined}>
        Ć
      </span>
    </button>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const script = useApp((st) => st.settings.script)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        <Link to="/" className={s.logo}>
          <span className={s.logoMark} aria-hidden="true">
            Ћ
          </span>
          <span className={s.logoText} lang="sr">
            {toScript('Српски дневник', script)}
          </span>
          <span className="visually-hidden">— на главную</span>
        </Link>
        <nav className={`${s.nav} ${open ? s.open : ''}`} aria-label="Основная навигация">
          <NavLink to="/" end className={s.navLink}>
            Курс
          </NavLink>
          <NavLink to="/cheatsheets" className={s.navLink}>
            Шпаргалки
          </NavLink>
          <NavLink to="/resources" className={s.navLink}>
            Ресурсы
          </NavLink>
        </nav>
        <div className={s.toggles}>
          <ScriptToggle />
          <ThemeToggle />
          <Link to="/settings" className={s.toggle} aria-label="Настройки" title="Настройки">
            <Icon name="settings" />
          </Link>
          <button
            type="button"
            className={`${s.toggle} ${s.menuBtn}`}
            aria-expanded={open}
            aria-label="Меню"
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <p>
          Уроки сделаны на основе материалов сайта{' '}
          <a href="https://lang.go-serbia.net/" target="_blank" rel="noopener noreferrer">
            Go-Serbia
          </a>{' '}
          и используются исключительно в некоммерческих целях.
        </p>
        <div className={s.footerLinks}>
          <VisitorCounter />
          <Link to="/settings">Настройки</Link>
        </div>
      </div>
    </footer>
  )
}

function GenderDialog() {
  const gender = useApp((st) => st.settings.gender)
  const setGender = useApp((st) => st.setGender)
  const [hydrated, setHydrated] = useState(useApp.persist.hasHydrated())
  useEffect(() => useApp.persist.onFinishHydration(() => setHydrated(true)), [])
  if (!hydrated || gender) return null
  return (
    <div className={s.backdrop}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="gender-title">
        <h2 id="gender-title">Как к тебе обращаться?</h2>
        <p>
          От этого зависят примеры и упражнения: <Sr>била сам / био сам</Sr>, <Sr>уморна / уморан</Sr>. Потом
          можно поменять в настройках.
        </p>
        <div className={s.choices}>
          <button type="button" className={s.choice} onClick={() => setGender('f')} autoFocus>
            <strong>В женском роде</strong>
            <small><Sr>Ја сам уморна.</Sr></small>
          </button>
          <button type="button" className={s.choice} onClick={() => setGender('m')}>
            <strong>В мужском роде</strong>
            <small><Sr>Ја сам уморан.</Sr></small>
          </button>
        </div>
      </div>
    </div>
  )
}

export function Layout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const [storageOk] = useState(isStorageAvailable)
  return (
    <div className={s.shell}>
      <a href="#main" className={s.skip}>
        К содержанию
      </a>
      <Header />
      {!storageOk && (
        <div className={s.storageWarn} role="status">
          Браузер не даёт сохранять данные: прогресс сохранится только до закрытия вкладки. Можно выгрузить его файлом в настройках.
        </div>
      )}
      <main id="main" className={`${s.main} ${wide ? s.mainWide : ''}`} tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <GenderDialog />
    </div>
  )
}

export { s as layoutStyles }
