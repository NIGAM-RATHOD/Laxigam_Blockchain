import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(18, 18, 28, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#f5f3ee',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '14px',
            boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.9)',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#d4af37',
              secondary: '#12121c',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
