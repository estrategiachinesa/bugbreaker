/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  RefreshCw, 
  ShieldCheck, 
  Globe, 
  UserCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import MatrixBackground from './components/MatrixBackground';
import HackerOverlay from './components/HackerOverlay';
import WithdrawModal from './components/WithdrawModal';
import AdminPanelModal from './components/AdminPanelModal';
import TypewriterText from './components/TypewriterText';
import { BrokerType, AppState } from './types';

export default function App() {
  // Application State - Persistent via localStorage
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('broker_breaker_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Force certain runtime animation-only flags to false on load
        return {
          ...parsed,
          isInjecting: false,
          showPixModal: false,
        };
      }
    } catch (e) {
      console.error("Error reading from localStorage:", e);
    }
    return {
      currentStep: 1,
      broker: null,
      userId: '',
      isUserIdVerified: false,
      depositStatus: 'idle',
      balance: 0,
      isInjecting: false,
      injectionProgress: 0,
      exploitLogs: [],
      showPixModal: false,
      pixKey: '',
      pixType: 'cpf',
      pixStatus: 'idle',
    };
  });

  // Verification Logs for Step 2
  const [verificationLogs, setVerificationLogs] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(false);
  const [exploitError, setExploitError] = useState<string | null>(null);
  const [showUserId, setShowUserId] = useState(false);

  // Admin panel trigger
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [botLink, setBotLink] = useState('https://t.me/BugBreakerBot');

  // Auto-configure Telegram Webhook on load using browser domain
  useEffect(() => {
    const setupTelegram = async () => {
      try {
        const host = window.location.host;
        await fetch(`/api/setup-telegram-webhook?host=${encodeURIComponent(host)}`);
      } catch (err) {
        console.error("Failed to automatically configure Telegram Webhook:", err);
      }
    };
    setupTelegram();

    const fetchBotLink = async () => {
      try {
        const docRef = doc(db, 'system_settings', 'telegram_bot');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.bot_link) {
            setBotLink(data.bot_link);
          }
        }
      } catch (err) {
        console.error("Error fetching bot link from Firestore:", err);
      }
    };
    fetchBotLink();
  }, []);

  // Global system active status (default to true)
  const [isSystemActive, setIsSystemActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('broker_breaker_system_active');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const handleToggleSystemActive = (active: boolean) => {
    setIsSystemActive(active);
    try {
      localStorage.setItem('broker_breaker_system_active', String(active));
    } catch (e) {
      console.error('Error saving system status', e);
    }
  };

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setShowAdminPanel(true);
        return 0; // reset
      }
      return next;
    });
  };

  // Helper to update both local state and local storage persistence
  const updateAppState = async (updates: Partial<AppState>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates };
      try {
        localStorage.setItem('broker_breaker_state', JSON.stringify(newState));
      } catch (err) {
        console.error("Error updating local storage:", err);
      }
      return newState;
    });
  };

  // Trigger authenticating state with verification against approved IDs list
  const handleVerifyId = async () => {
    if (!state.userId.trim() || !state.broker) return;
    setIsVerifying(true);
    setVerificationError(false);
    setVerificationLogs([]);

    let isApproved = false;
    let brokerMatches = false;
    let isActive = false;

    try {
      const docRef = doc(db, 'approved_ids', state.userId.trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        isApproved = true;
        brokerMatches = (data.broker || 'IQ Option') === state.broker;
        isActive = data.active !== false;
      } else {
        // Fallback for default ID for developer testing/offline
        if (state.userId.trim() === '12345678') {
          isApproved = true;
          brokerMatches = 'IQ Option' === state.broker;
          isActive = true;
        }
      }
    } catch (error) {
      console.error('Error verifying ID in Firestore:', error);
      try {
        handleFirestoreError(error, OperationType.GET, `approved_ids/${state.userId.trim()}`);
      } catch (e) {
        // Fallback in case of Firestore error
        if (state.userId.trim() === '12345678') {
          isApproved = true;
          brokerMatches = 'IQ Option' === state.broker;
          isActive = true;
        }
      }
    }

    let logTemplates: string[] = [];

    if (!isSystemActive) {
      logTemplates = [
        "Iniciando negociação de handshake SSL/TLS...",
        `Conectando-se ao cluster seguro de ${state.broker}...`,
        "ERRO CRÍTICO: CONEXÃO REJEITADA PELO ADMINISTRADOR.",
        "STATUS: O SISTEMA DE EXPLORAÇÃO ESTÁ TEMPORARIAMENTE INATIVO.",
        "Por favor, aguarde o restabelecimento do sistema ou tente mais tarde."
      ];
    } else if (isApproved && !brokerMatches) {
      logTemplates = [
        "Iniciando negociação de handshake SSL/TLS...",
        `Conectando-se ao cluster seguro de ${state.broker}...`,
        "Erro de compatibilidade detectado no cabeçalho...",
        `ALERTA: ID [${state.userId}] está registrado em outra corretora.`,
        `ERRO: ID inválido para a corretora selecionada (${state.broker}).`
      ];
    } else if (isApproved) {
      // Both active and inactive approved IDs will see validation success here, to proceed to step 3
      logTemplates = [
        "Iniciando negociação de handshake SSL/TLS...",
        `Conectando-se ao cluster seguro de ${state.broker}...`,
        "Localizando credenciais do ID em logs do servidor...",
        `Bypass de autorização ID [${state.userId}] em andamento...`,
        "Chave de criptografia decodificada: AUTH_OK_SESSION_TOK_EX",
        "Sessão validada com sucesso! Usuário autenticado."
      ];
    } else {
      logTemplates = [
        "Iniciando negociação de handshake SSL/TLS...",
        `Conectando-se ao cluster seguro de ${state.broker}...`,
        "Localizando credenciais do ID em logs do servidor...",
        `Tentativa de bypass de autorização ID [${state.userId}]...`,
        "STATUS: CHAVE DE ASSINATURA PENDENTE DE LIBERAÇÃO.",
        "ERRO: ID não cadastrado na central de segurança. Fale com o suporte."
      ];
    }

    let currentLog = 0;
    const interval = setInterval(() => {
      if (currentLog < logTemplates.length) {
        setVerificationLogs((prev) => [...prev, logTemplates[currentLog]]);
        currentLog++;
      } else {
        clearInterval(interval);
        setIsVerifying(false);
        if (isSystemActive && isApproved && brokerMatches) {
          updateAppState({
            isUserIdVerified: true,
            currentStep: 3, // proceed to Step 3 (Deposit/Execute)
          });
          setVerificationError(false);
        } else {
          updateAppState({
            isUserIdVerified: false,
          });
          setVerificationError(true);
        }
      }
    }, 900);
  };

  // Select broker option
  const handleSelectBroker = (broker: BrokerType) => {
    updateAppState({
      broker,
      currentStep: 2, // Move to step 2 automatically
    });

    const url = broker === 'IQ Option'
      ? 'https://affiliate.iqoption.net/redir/?aff=198544&aff_model=revenue&afftrack=gub'
      : 'https://exnova.com/lp/start-trading/?aff=198544&aff_model=revenue&afftrack=gub';
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Open broker link for deposit
  const handleOpenBrokerUrl = () => {
    if (!state.broker) return;
    const url = state.broker === 'IQ Option' 
      ? 'https://iqoption.com/pt/counting' 
      : 'https://trade.exnova.com/pt/counting';
    window.open(url, '_blank', 'noopener,noreferrer');
    updateAppState({
      depositStatus: 'clicked',
    });
  };

  // Confirm deposit of R$ 1.000,00
  const handleConfirmDeposit = () => {
    updateAppState({
      balance: 1000,
      depositStatus: 'confirmed',
      currentStep: 4, // Unlock exploit phase
    });
  };

  // Trigger Exploit
  const handleExecuteExploit = async () => {
    if (!isSystemActive) {
      setExploitError(
        "SISTEMA TEMPORARIAMENTE INATIVO: A rede central de exploração foi desativada pelo administrador. Por favor, aguarde o restabelecimento dos servidores ou entre em contato com o suporte."
      );
      return;
    }

    const currentIdStr = state.userId.trim();
    let isApproved = false;
    let brokerMatches = false;
    let isActive = false;

    try {
      const docRef = doc(db, 'approved_ids', currentIdStr);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        isApproved = true;
        brokerMatches = (data.broker || 'IQ Option') === state.broker;
        isActive = data.active !== false;
      } else {
        // Fallback for default ID for developer testing/offline
        if (currentIdStr === '12345678') {
          isApproved = true;
          brokerMatches = 'IQ Option' === state.broker;
          isActive = true;
        }
      }
    } catch (error) {
      console.error('Error verifying ID in Firestore during exploit:', error);
      try {
        handleFirestoreError(error, OperationType.GET, `approved_ids/${currentIdStr}`);
      } catch (e) {
        // Fallback in case of Firestore error
        if (currentIdStr === '12345678') {
          isApproved = true;
          brokerMatches = 'IQ Option' === state.broker;
          isActive = true;
        }
      }
    }

    if (!isApproved || !brokerMatches) {
      setExploitError(
        `CONTA INCOMPATÍVEL: O ID de usuário [${currentIdStr}] não está registrado para funcionar na corretora ${state.broker || 'selecionada'}. Por favor, volte ao início ou certifique-se de que o ID inserido condiz com a corretora ativa.`
      );
      return;
    }

    if (!isActive) {
      setExploitError(
        "DEPÓSITO NECESSÁRIO NÃO CONSTATADO: O sistema de validação não detectou o depósito de ativação qualificatório nos registros da corretora para o ID do usuário conectado. Efetue o depósito na sua conta da corretora para ativar o ID e repita o processo para executar o bug com sucesso."
      );
      return;
    }

    setExploitError(null);
    setState((prev) => ({
      ...prev,
      isInjecting: true,
    }));
  };

  // Successful Exploit Callback from Hacker Overlay
  const handleExploitSuccess = (finalBalance: number) => {
    updateAppState({
      balance: finalBalance,
      isInjecting: false,
      currentStep: 5, // Fully exploited and unlocked withdraw
    });
  };

  // Redirect to broker withdrawal page
  const handleWithdrawClick = () => {
    if (!state.broker) return;
    const url = state.broker === 'IQ Option' 
      ? 'https://iqoption.com/pt/withdrawal' 
      : 'https://trade.exnova.com/pt/withdrawal';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Reset state
  const handleReset = () => {
    updateAppState({
      currentStep: 1,
      broker: null,
      userId: '',
      isUserIdVerified: false,
      depositStatus: 'idle',
      balance: 0,
      isInjecting: false,
      injectionProgress: 0,
      exploitLogs: [],
      showPixModal: false,
      pixKey: '',
      pixType: 'cpf',
      pixStatus: 'idle',
    });
    setVerificationLogs([]);
    setIsVerifying(false);
    setExploitError(null);
  };

  // Active Game Application
  return (
    <div className="fixed inset-0 bg-[#050505] font-sans text-emerald-50 overflow-hidden flex flex-col select-none">
      {/* 1. Matrix Background Layer */}
      <MatrixBackground />

      {/* Top Navigation Bar */}
      <nav className="relative z-10 w-full h-16 border-b border-emerald-500/20 bg-black/40 backdrop-blur-md flex items-center justify-between px-8">
        <div className="flex items-center gap-3 select-none">
          <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <path d="M9 3v18" />
              <path d="m16 8-2 2 2 2" />
              <path d="m19 10-2 2 2 2" />
            </svg>
          </div>
          <span className="text-xl font-display font-extrabold tracking-widest text-emerald-400 uppercase italic">
            Broker Breaker <span className="text-[10px] bg-emerald-500 text-black px-1.5 py-0.5 rounded align-middle ml-1 font-mono font-black">PRO</span>
          </span>
        </div>

        {/* User profile details */}
        <div className="flex items-center gap-4 relative z-20">
          <div className="flex flex-col text-right">
            <div className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1 justify-end">
              <span className={`h-2 w-2 rounded-full ${isSystemActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></span>
              <span className="uppercase text-[10px] tracking-widest font-black">
                {isSystemActive ? 'SISTEMA ATIVO' : 'SISTEMA INATIVO'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Viewport Layout */}
      <main className="relative z-10 flex flex-col lg:flex-row flex-1 p-6 gap-6 h-[calc(100%-4rem)] overflow-y-auto lg:overflow-hidden">
        
        {/* Left Content: Setup Steps & Terminal Logs */}
        <div className="flex-[1.8] flex flex-col gap-4 h-full">
          <div className="flex-1 bg-black/60 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)] flex flex-col justify-between overflow-y-auto lg:overflow-hidden">
            
            {/* Steps Container Header */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-display font-extrabold text-emerald-400 flex items-center gap-2 tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                    <path d="M20 7h-9" />
                    <path d="M14 17H5" />
                    <circle cx="17" cy="17" r="3" />
                    <circle cx="7" cy="7" r="3" />
                  </svg>
                  CONFIGURAÇÃO DO EXPLOIT DO SISTEMA
                </h2>
                <div className="flex gap-2">
                  <div className={`h-1 w-12 rounded-full transition-colors duration-300 ${state.currentStep >= 1 ? 'bg-emerald-500' : 'bg-emerald-500/20'}`}></div>
                  <div className={`h-1 w-12 rounded-full transition-colors duration-300 ${state.currentStep >= 3 ? 'bg-emerald-500' : 'bg-emerald-500/20'}`}></div>
                  <div className={`h-1 w-12 rounded-full transition-colors duration-300 ${state.currentStep >= 4 ? 'bg-emerald-500' : 'bg-emerald-500/20'}`}></div>
                </div>
              </div>

              {/* Steps grid with three modules side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Module 1: Corretora */}
                <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <label className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-tighter block font-mono">
                    Passo 01: Selecionar Corretora
                  </label>
                  
                  <div className="space-y-2">
                    <button
                      id="btn-select-iqoption"
                      onClick={() => handleSelectBroker('IQ Option')}
                      disabled={state.currentStep > 2}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 cursor-pointer border ${
                        state.broker === 'IQ Option'
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-400 font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.25)] scale-[1.02]'
                          : state.broker !== null
                          ? 'bg-white/5 border-white/5 text-emerald-100/20 opacity-30 scale-[0.98]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-emerald-100/60 disabled:opacity-50'
                      }`}
                    >
                      <span className="font-display font-bold text-xs tracking-wider uppercase">IQ Option</span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        state.broker === 'IQ Option' ? 'border-emerald-400 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-white/20'
                      }`}>
                        {state.broker === 'IQ Option' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>

                    <button
                      id="btn-select-exnova"
                      onClick={() => handleSelectBroker('Exnova')}
                      disabled={state.currentStep > 2}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 cursor-pointer border ${
                        state.broker === 'Exnova'
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-400 font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.25)] scale-[1.02]'
                          : state.broker !== null
                          ? 'bg-white/5 border-white/5 text-emerald-100/20 opacity-30 scale-[0.98]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-emerald-100/60 disabled:opacity-50'
                      }`}
                    >
                      <span className="font-display font-bold text-xs tracking-wider uppercase">Exnova</span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        state.broker === 'Exnova' ? 'border-emerald-400 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-white/20'
                      }`}>
                        {state.broker === 'Exnova' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Module 2: Identificação do Alvo */}
                <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <label className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-tighter block font-mono">
                    Passo 02: ID DE USUÁRIO
                  </label>
                  
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        id="broker-id-input"
                        type={showUserId ? "text" : "password"}
                        maxLength={12}
                        placeholder="ID DE USUÁRIO"
                        disabled={state.currentStep < 2 || isVerifying || state.isUserIdVerified}
                        value={state.userId}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setState((prev) => ({ ...prev, userId: val }));
                          setVerificationError(false);
                        }}
                        className="w-full bg-black/50 border border-emerald-500/30 rounded-xl py-3 pl-4 pr-10 font-mono text-emerald-400 placeholder:text-emerald-900 focus:outline-none focus:ring-1 ring-emerald-500 text-xs tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserId(!showUserId)}
                        disabled={state.currentStep < 2 || isVerifying || state.isUserIdVerified}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/60 hover:text-emerald-400 transition-colors cursor-pointer p-1 rounded-md hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={showUserId ? "Ocultar ID" : "Mostrar ID"}
                      >
                        {showUserId ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    {state.isUserIdVerified ? (
                      <div className="w-full py-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-xl font-mono text-[10px] text-center flex items-center justify-center gap-1.5 uppercase font-bold tracking-wider">
                        <ShieldCheck size={12} className="text-emerald-400 animate-pulse" />
                        <span>CONECTADO: {state.userId}</span>
                      </div>
                    ) : (
                      <>
                        <button
                          id="btn-verify-broker-id"
                          onClick={handleVerifyId}
                          disabled={state.currentStep < 2 || isVerifying || state.userId.length < 8}
                          className="w-full py-3 bg-emerald-500 text-black font-display font-extrabold text-xs uppercase rounded-xl hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
                        >
                          {isVerifying ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>VERIFICANDO...</span>
                            </>
                          ) : (
                            <span>VERIFICAR CONEXÃO</span>
                          )}
                        </button>

                        {verificationError && !isVerifying && (
                          <div className="mt-2 text-center p-2.5 bg-red-950/20 border border-red-500/20 rounded-xl">
                            <div className="text-red-500 font-bold text-xs">
                              ID não autorizado.
                            </div>
                            <a 
                              href={botLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-red-400 underline hover:text-red-300 font-bold text-[11px] block mt-1 hover:scale-102 active:scale-98 transition-transform"
                            >
                              Clique aqui para falar com o suporte e liberar seu acesso
                            </a>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Module 3: Sincronização */}
                <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <label className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-tighter block font-mono">
                    Passo 03: Sincronização Depósito
                  </label>
                  
                  <div className="space-y-2">
                    <button
                      id="btn-deposit-link"
                      disabled={state.currentStep < 3 || state.depositStatus === 'confirmed'}
                      onClick={handleOpenBrokerUrl}
                      className={`w-full py-3 text-[11px] uppercase font-display font-black rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        state.currentStep < 3
                          ? 'bg-black/40 border-white/5 text-emerald-950/40 cursor-not-allowed'
                          : state.depositStatus === 'confirmed'
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-500 font-bold'
                          : state.depositStatus === 'clicked'
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                          : 'bg-emerald-500/10 border-emerald-500/60 hover:border-emerald-400 text-emerald-300 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] animate-pulse'
                      }`}
                    >
                      <Globe size={12} className={state.currentStep >= 3 && state.depositStatus === 'idle' ? 'animate-spin-slow' : ''} />
                      <span>{state.depositStatus === 'confirmed' ? 'DEPÓSITO GERADO' : 'GERAR DEPÓSITO'}</span>
                    </button>

                    <button
                      id="btn-confirm-deposit"
                      onClick={handleConfirmDeposit}
                      disabled={state.currentStep < 3 || state.depositStatus !== 'clicked'}
                      className={`w-full py-3 font-display font-black text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        state.currentStep < 3 || state.depositStatus !== 'clicked'
                          ? 'bg-white/5 border border-white/5 text-emerald-950/30 cursor-not-allowed opacity-50'
                          : 'bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 shadow-[0_0_25px_rgba(16,185,129,0.4)] border-t border-emerald-300 animate-bounce-subtle'
                      }`}
                    >
                      <CheckCircle size={12} />
                      <span>CONFIRMAR INSERÇÃO</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Terminal Output */}
            <div className="mt-6 bg-black/80 rounded-lg p-4 border border-emerald-900/50 font-mono text-[11px] leading-relaxed overflow-hidden flex flex-col flex-1 min-h-[140px] lg:max-h-[180px]">
              <div className="flex items-center gap-2 mb-2 border-b border-emerald-900/30 pb-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="ml-2 opacity-50 text-[10px]">terminal.bash</span>
                {state.broker && <span className="ml-auto text-emerald-500/40 text-[9px] uppercase">Gateway: {state.broker}</span>}
              </div>
              
              <div className="space-y-1 overflow-y-auto flex-1 pr-1 text-emerald-500/90 font-mono select-text">
                <div>[SYSTEM] Módulo de intrusão local inicializado com sucesso.</div>
                {state.broker ? (
                  <div className="text-emerald-400">[SYSTEM] Broker selecionado: {state.broker} (Porta 3000)</div>
                ) : (
                  <div className="text-emerald-500/50">[SYSTEM] Canal ocioso. Aguardando seleção de corretora...</div>
                )}

                {verificationLogs.map((log, index) => {
                  const isError = /erro|alerta|status/i.test(log);
                  return (
                    <div 
                      key={index} 
                      className={isError ? "text-red-500 font-bold" : "text-emerald-400"}
                    >
                      &gt; <TypewriterText text={log} speed={5} />
                    </div>
                  );
                })}

                {isVerifying && (
                  <div className="text-emerald-400 animate-pulse">&gt; Estabelecendo conexão via SSH tunneling remota...</div>
                )}

                {state.isUserIdVerified && !isVerifying && (
                  <div className="text-emerald-300 font-bold">&gt; Bypass de firewall v4.2 completado. Canal aberto.</div>
                )}

                {state.depositStatus === 'clicked' && (
                  <div className="text-emerald-400/80">&gt; Link de verificação aberto. Aguardando confirmação...</div>
                )}

                {state.depositStatus === 'confirmed' && (
                  <div className="text-emerald-400 font-bold">&gt; Depósito confirmado de R$ 1.000,00 nos registros locais.</div>
                )}

                {state.currentStep === 4 && (
                  <div className="text-red-400 font-bold animate-pulse">&gt; [ALERTA] Injeção de buffer overflow pronta. Aguardando gatilho principal.</div>
                )}

                {state.currentStep === 5 && (
                  <div className="text-emerald-300 font-bold">&gt; [PROCESSO CONCLUÍDO] R$ 10.000,00 consolidados nos cookies locais!</div>
                )}
              </div>
            </div>

          </div>

          {/* Big Action Trigger Footer Button */}
          {state.currentStep === 4 ? (
            <button
              id="btn-execute-exploit"
              onClick={handleExecuteExploit}
              className="h-24 bg-red-600/20 border-2 border-red-500 rounded-2xl flex items-center justify-center gap-4 group hover:bg-red-600/30 transition-all cursor-pointer overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-red-500 opacity-10 blur-xl group-hover:opacity-20 animate-pulse"></div>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 group-hover:scale-110 transition-transform">
                <path d="m18 10 4 2-4 2" />
                <path d="M12 10V6" />
                <path d="m2 10 4 2-4 2" />
                <path d="m6 16 1 1" />
                <path d="m13.4 10.6 2.7-2.7" />
                <circle cx="12" cy="14" r="8" />
              </svg>
              <span className="text-2xl font-black text-red-500 tracking-[0.2em] group-hover:tracking-[0.3em] transition-all uppercase font-display">
                EXECUTAR BUG
              </span>
            </button>
          ) : state.currentStep > 4 ? (
            <div className="h-24 bg-emerald-500/10 border-2 border-emerald-500 rounded-2xl flex items-center justify-center gap-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-emerald-400 opacity-10 blur-xl"></div>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 animate-pulse">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="text-2xl font-black text-emerald-400 tracking-[0.2em] uppercase font-display">
                EXPLOIT INJETADO
              </span>
            </div>
          ) : (
            <div className="h-24 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-4 opacity-40 select-none relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/60">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-lg font-bold text-emerald-500/40 tracking-[0.15em] uppercase font-display">
                AGUARDANDO ETAPAS DE SEGURANÇA
              </span>
            </div>
          )}
        </div>

        {/* Right Sidebar: Stats & Balance */}
        <aside className="flex-1 flex flex-col gap-4 h-full">
          
          {/* Balance Card */}
          <div className="bg-black/60 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]">
            <span className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase font-mono">Saldo em Conta</span>
            <div className="text-4xl sm:text-5xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] font-display text-glow-green">
              R$ {state.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            
            {/* Balance visual progress bar */}
            <div className="w-full h-1.5 bg-emerald-900/50 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-emerald-400 shadow-[0_0_10px_#10b981] transition-all duration-500"
                style={{ width: `${Math.min((state.balance / 10000) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between w-full mt-2 text-[9px] font-mono opacity-50">
              <span>MIN: R$ 1.000,00</span>
              <span>META TARGET: R$ 10.000,00</span>
            </div>
          </div>

          {/* Stats Grid Dashboard */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] opacity-50 font-mono uppercase">CONEXÃO VPN</span>
              <span className="text-emerald-500 font-bold font-mono tracking-wider text-xs">PROTEGIDO</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] opacity-50 font-mono uppercase">PING REMOTO</span>
              <span className="text-emerald-500 font-bold font-mono text-xs">12MS (STABLE)</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] opacity-50 font-mono uppercase">CPU LOAD</span>
              <div className="flex items-end gap-1 mt-1">
                <div className="w-1 h-3 bg-emerald-500"></div>
                <div className="w-1 h-5 bg-emerald-500"></div>
                <div className="w-1 h-2 bg-emerald-900"></div>
                <div className="w-1 h-4 bg-emerald-900"></div>
                <span className="ml-1 text-emerald-500 font-bold font-mono text-xs">24%</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] opacity-50 font-mono uppercase">ENCRIPTAÇÃO</span>
              <span className="text-emerald-500 font-bold font-mono text-xs">AES-256</span>
            </div>
          </div>

          {/* Withdrawal Status block or Action trigger button */}
          {state.currentStep === 5 ? (
            <button
              id="btn-withdraw-balance"
              onClick={handleWithdrawClick}
              className="w-full p-4 bg-emerald-500 text-black font-display font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer uppercase text-sm tracking-widest mt-auto font-mono"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
              REALIZAR SAQUE {state.broker === 'IQ Option' ? 'NETELLER' : 'PIX'}
            </button>
          ) : (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3 mt-auto select-none">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 opacity-40">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1">
                {state.broker ? (
                  <>
                    <div className="text-[10px] font-bold opacity-30 uppercase font-mono">
                      Saque {state.broker === 'IQ Option' ? 'via Neteller' : 'via PIX'}
                    </div>
                    <div className="text-xs italic opacity-30 font-mono">Aguardando injeção de saldo...</div>
                  </>
                ) : null}
              </div>
            </div>
          )}

        </aside>
      </main>

      {/* Footer Bar */}
      <footer className="relative z-10 w-full h-8 px-8 bg-emerald-950/20 border-t border-emerald-500/10 flex items-center justify-between text-[10px] font-mono text-emerald-500/50">
        <div className="flex gap-4">
          <span>v4.0.1-STABLE</span>
          <span 
            onClick={handleLogoClick}
            className="cursor-default select-none font-bold"
          >
            LICENSE: ACTIVE
          </span>
        </div>
        {state.currentStep > 1 && (
          <button 
            onClick={handleReset}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase hover:underline transition-all cursor-pointer flex items-center gap-1 font-mono"
          >
            <RefreshCw size={10} className="animate-spin-slow" />
            REINICIAR SISTEMA
          </button>
        )}
        <div className="hidden sm:flex gap-4">
          <span>REGION: BR-LATAM-1</span>
          <span>ENCRYPTED: TRUE</span>
        </div>
      </footer>

      {/* Interactive Hacker Overlay (Step 4 Exploit sequence) */}
      <HackerOverlay 
        isOpen={state.isInjecting} 
        onSuccess={handleExploitSuccess} 
      />

      {/* Cyber Security Validation Failure Alert */}
      {exploitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0a0000] border-2 border-red-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] overflow-hidden">
            {/* Flashing laser border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse"></div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/30 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>

              <h4 className="font-display font-black text-base tracking-wider text-red-500 uppercase">
                SISTEMA INCOMPATÍVEL: DEPÓSITO REQUISITADO
              </h4>

              <p className="font-mono text-[11px] text-red-200/80 leading-relaxed bg-red-950/20 border border-red-900/30 p-4 rounded-xl text-left">
                {exploitError}
              </p>

              <button
                onClick={() => setExploitError(null)}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-display font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg shadow-red-500/20 active:scale-95"
              >
                ENTENDI E VOU FAZER O DEPÓSITO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw PIX Modal */}
      <WithdrawModal 
        isOpen={state.showPixModal} 
        balance={state.balance}
        onClose={() => setState((prev) => ({ ...prev, showPixModal: false }))}
        onReset={handleReset}
      />

      {/* Admin Panel Modal */}
      <AdminPanelModal 
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        isSystemActive={isSystemActive}
        onToggleSystemActive={handleToggleSystemActive}
      />
    </div>
  );
}
