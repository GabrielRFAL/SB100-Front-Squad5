import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { ResponseModeProvider } from './app/response-mode/ResponseModeContext';
import { UserProfileProvider } from './app/user-profile/UserProfileContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProfileProvider>
      <ResponseModeProvider>
        <App />
      </ResponseModeProvider>
    </UserProfileProvider>
  </React.StrictMode>
);
