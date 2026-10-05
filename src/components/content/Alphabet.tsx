import s from './content.module.css'
import { ALPHABET, NEW_LETTERS } from '../../content/alphabet'
import { SrText } from '../sr/Sr'
import { Say } from './Say'

/** Полная таблица азбуки: обе записи сразу, поэтому переключатель алфавита на неё не влияет. */
export function AlphabetTable() {
  return (
    <div className="table-wrap">
      <table className={s.alphabet}>
        <thead>
          <tr>
            <th>Кириллица</th>
            <th>Латиница</th>
            <th>Звук</th>
            <th>Пример</th>
          </tr>
        </thead>
        <tbody>
          {ALPHABET.map((l) => (
            <tr key={l.cyr} className={l.isNew ? s.new : undefined}>
              <td lang="sr">{l.cyr}</td>
              <td lang="sr">{l.lat}</td>
              <td>{l.sound}</td>
              <td>
                <span className={s.exCell}>
                  <Say word={l.ex} />
                  <span>
                    <SrText text={l.ex} /> — {l.exRu}
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Карточки шести «новых» букв. */
export function NewLetters() {
  return (
    <div className={s.letters}>
      {NEW_LETTERS.map((l) => (
        <div key={l.cyr} className={s.letter}>
          <div className={s.letterBig} lang="sr">
            {l.cyr}
          </div>
          <div className={s.letterLat} lang="sr">
            {l.lat}
          </div>
          <div className={s.letterSound}>{l.sound}</div>
          <div className={s.letterEx}>
            <Say word={l.ex} /> <SrText text={l.ex} /> — {l.exRu}
          </div>
          {l.tip && <p style={{ fontSize: '0.85em', margin: '6px 0 0', textAlign: 'left' }}>{l.tip}</p>}
        </div>
      ))}
    </div>
  )
}
