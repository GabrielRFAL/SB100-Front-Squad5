import logo from "../../assets/LogoSB100-semfundo.png"
import { Circle } from 'lucide-react';

interface ChatHeaderProps {
  isLoading: boolean;
  children?: React.ReactNode;
}

export function ChatHeader({ isLoading, children }: ChatHeaderProps) {
  return (
    <header className="hidden border-b border-slate-200 bg-white shadow-sm lg:block">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo SB100" className="h-10 w-auto"/>
            <div className="h-12 w-1 rounded-full bg-emerald-800" />
            <div>
              <h1 className="text-2xl tracking-tight text-slate-900">Agente SB100</h1>
              <p className="text-sm text-slate-500 mt-0.5">Assistente Científico</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
              <Circle className={`h-2.5 w-2.5 fill-current ${isLoading ? 'animate-pulse text-amber-500' : 'text-emerald-600'}`} aria-hidden="true" />
              {isLoading ? 'Digitando...' : 'Online'}
            </div>
            {children}
          </div>
        </div>
      </div>
    </header>
  );
}
