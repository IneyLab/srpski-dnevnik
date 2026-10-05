import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import Home from './pages/Home'
import Week from './pages/Week'
import Lesson from './pages/Lesson'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import Character from './pages/Character'
import MapPage from './pages/MapPage'
import Cards from './pages/Cards'
import Mistakes from './pages/Mistakes'
import { Cheatsheets, Checkpoint, Resources } from './pages/MdxPages'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/week/:n" element={<Week />} />
          <Route path="/week/:n/lesson/:s" element={<Lesson />} />
          <Route path="/checkpoint/:n" element={<Checkpoint />} />
          <Route path="/cheatsheets" element={<Cheatsheets />} />
          <Route path="/cheatsheets/:slug" element={<Cheatsheets />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/character" element={<Character />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/mistakes" element={<Mistakes />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
