import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProductListPage } from './admin/pages/ProductListPage'
import { ProductEditPage } from './admin/pages/ProductEditPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductListPage />} />
        <Route path="/products/new" element={<ProductEditPage />} />
        <Route path="/products/:productId/edit" element={<ProductEditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
