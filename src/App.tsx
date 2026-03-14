import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'

function App() {
  return (
    <BrowserRouter basename="/cma_dushboard">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/items" element={<Items />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
