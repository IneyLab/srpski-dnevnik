import { Link } from 'react-router-dom'
import { Sr } from '../components/sr/Sr'

export default function NotFound() {
  return (
    <>
      <h1>
        <Sr>Изгубили смо се!</Sr>
      </h1>
      <p>Такой страницы нет («Мы заблудились!»). Возможно, эта неделя ещё не опубликована.</p>
      <p>
        <Link to="/" className="btn btn-primary">
          К оглавлению
        </Link>
      </p>
    </>
  )
}
