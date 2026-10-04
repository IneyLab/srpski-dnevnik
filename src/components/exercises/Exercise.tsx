import { EXERCISES } from '../../content/registry'
import { Choice, Listen } from './Choice'
import { FillIn, Dictation, ScriptConvert } from './TextInputs'
import { Match } from './Match'
import { Build } from './Build'

/** Вставка упражнения в MDX: <Exercise id="w1.s1.letters" /> */
export function Exercise({ id }: { id: string }) {
  const ex = EXERCISES[id]
  if (!ex) {
    return <p style={{ color: 'var(--bad)' }}>Упражнение «{id}» не найдено.</p>
  }
  switch (ex.type) {
    case 'choice':
      return <Choice ex={ex} />
    case 'listen':
      return <Listen ex={ex} />
    case 'fill':
      return <FillIn ex={ex} />
    case 'dictation':
      return <Dictation ex={ex} />
    case 'script':
      return <ScriptConvert ex={ex} />
    case 'match':
      return <Match ex={ex} />
    case 'build':
      return <Build ex={ex} />
  }
}
