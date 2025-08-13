import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './App.css'
import '../.superdesign/design_iterations/theme_vintage_1.css'
import '../.superdesign/design_iterations/default_ui_darkmode.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
