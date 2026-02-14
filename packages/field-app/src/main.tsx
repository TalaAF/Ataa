import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { FamilyAuthProvider } from './context/FamilyAuthContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FamilyAuthProvider>
          <App />
        </FamilyAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
