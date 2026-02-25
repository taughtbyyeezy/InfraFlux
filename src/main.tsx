import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ToastProvider } from './contexts/ToastContext'
import { ToastContainer } from './components/Toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ToastProvider>
            <App />
            <ToastContainer />
        </ToastProvider>
    </React.StrictMode>,
)
