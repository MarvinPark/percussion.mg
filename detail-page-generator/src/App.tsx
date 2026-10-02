import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProductListPage } from './admin/pages/ProductListPage'
import { ProductNewPlaceholderPage } from './admin/pages/ProductNewPlaceholderPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductListPage />} />
        <Route path="/products/new" element={<ProductNewPlaceholderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
