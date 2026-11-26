import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import SandboxApp from './app/sandbox/SandboxApp';
import { isSandboxEnabled } from './app/sandbox/access';
import { ResponseModeProvider } from './app/response-mode/ResponseModeContext';
import { UserProfileProvider } from './app/user-profile/UserProfileContext';
import './styles/index.css';

const isSandboxRoute = window.location.pathname === '/sandbox';
function SandboxUnavailable() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-slate-900"><div><h1 className="text-2xl font-semibold">Sandbox indisponível</h1><p className="mt-2 text-slate-600">Esta ferramenta só está habilitada em ambiente de desenvolvimento.</p></div></main>;
}
const sandboxEnabled = isSandboxEnabled({
  dev: import.meta.env.DEV,
  flag: import.meta.env.VITE_ENABLE_SANDBOX,
});
const Root = isSandboxRoute ? (sandboxEnabled ? SandboxApp : SandboxUnavailable) : App;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isSandboxRoute ? <Root /> : <UserProfileProvider><ResponseModeProvider><Root /></ResponseModeProvider></UserProfileProvider>}
  </React.StrictMode>
);
