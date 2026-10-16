import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { UserProfileProvider } from './app/user-profile/UserProfileContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProfileProvider>
      <App />
    </UserProfileProvider>
  </React.StrictMode>
);
