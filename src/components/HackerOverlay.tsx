/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, Cpu, CheckCircle, AlertTriangle } from 'lucide-react';
import TypewriterText from './TypewriterText';

interface HackerOverlayProps {
  isOpen: boolean;
  onSuccess: (finalValue: number) => void;
}

const playSuccessSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const playBellTone = (freq: number, startTime: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      // Subtle pitch drop on resonance decay
      osc.frequency.exponentialRampToValueAtTime(freq * 0.99, startTime + duration);

      // Fast attack (0.005s) and slow exponential decay
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // First Bell Chord (Now)
    playBellTone(880.00, now, 1.8, 0.08);        // Fundamental (A5)
    playBellTone(1109.73, now, 1.4, 0.04);       // Major Third (C#6)
    playBellTone(1318.51, now, 1.2, 0.03);       // Fifth (E6)
    playBellTone(1760.00, now, 0.8, 0.015);      // Octave (A6)

    // Second Ringing Chord (80ms later for a luxurious double-strike "ding-ding" chime)
    const delay = 0.08;
    playBellTone(1318.51, now + delay, 2.0, 0.06); // Fifth (E6)
    playBellTone(1648.14, now + delay, 1.5, 0.03); // Third (G#6)
    playBellTone(1975.53, now + delay, 1.3, 0.02); // Fifth/Octave (B6)
  } catch (err) {
    console.error("Audio synthesis failed:", err);
  }
};

const HACKER_LOGS_TEMPLATES = [
  { text: "INICIALIZANDO CORE_EXPLORER_V2.14...", type: "info" },
  { text: "NEGOCIANDO HANDSHAKE COM HOST REMOTO...", type: "info" },
  { text: "ESTABELECENDO CANAL TUNELADO CRIPTOGRAFADO (AES-256)...", type: "info" },
  { text: "SISTEMA DETECTADO: CENTRAL DE LIQUIDAÇÕES E COMPENSAÇÕES", type: "info" },
  { text: "REDIRECIONANDO PACOTES DE REDE ATRAVÉS DE PROXIES ANÔNIMOS...", type: "info" },
  { text: "SINALIZANDO CONEXÃO LOCAL DE TESTE...", type: "info" },
  { text: "ERRO DE VALIDAÇÃO: ACESSO AO KERNEL NEGADO (ERRO 403)", type: "error" },
  { text: "INICIANDO PROTOCOLO DE CONCURRÊNCIA RECORRENTE...", type: "warning" },
  { text: "INJETANDO OVERRIDE DE SEGURANÇA NO PACOTE DE RETORNO...", type: "warning" },
  { text: "DESVIANDO DA ASSINATURA DE MULTI-FATOR (MFA/OAuth)... OK!", type: "success" },
  { text: "IGNORANDO REGRA DE VALIDAÇÃO DE DEPÓSITO DO BROKER...", type: "success" },
  { text: "LOCALIZANDO SALDO DA CONTA DE OPERAÇÕES...", type: "info" },
  { text: "VETOR DE SEGURANÇA QUEBRADO - INICIANDO PROCESSO DE INJEÇÃO...", type: "critical" },
  { text: "INJETANDO PARCELAS DE COMPLEMENTO DE SALDO (DELTA UPDATE)...", type: "critical" },
  { text: "PROCESSO DE MEMÓRIA EM ANDAMENTO NO ENDEREÇO 0x7FFF8A12BC...", type: "info" },
  { text: "CONFIRMANDO REGISTROS DE BACKEND DA CORRETORA...", type: "info" },
  { text: "SINCRO_WALLETS: ATUALIZANDO DADOS CENTRAIS DO USUÁRIO...", type: "success" },
  { text: "CONEXÃO CONFIRMADA - ATRIBUTO 'BALANCE' GRAVADO COM SUCESSO.", type: "success" },
  { text: "LIMPANDO REGISTROS DE ACESSO (LOG_WIPER ATIVO)...", type: "warning" },
  { text: "DESCONECTANDO DO GATEWAY REMOTO COM SEGURANÇA.", type: "success" },
  { text: "EXPLORAÇÃO CONCLUÍDA! SALDO SINTETIZADO COM SUCESSO.", type: "success" },
];

export default function HackerOverlay({ isOpen, onSuccess }: HackerOverlayProps) {
  const [logs, setLogs] = useState<Array<{ id: string; text: string; type: string }>>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(1000);
  const [stage, setStage] = useState<'running' | 'completed'>('running');
  
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const logIndexRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  // Trigger sound effect or logs stream on open
  useEffect(() => {
    if (!isOpen) return;

    // Reset state
    setLogs([]);
    setCurrentProgress(0);
    setCurrentBalance(1000);
    setStage('running');
    logIndexRef.current = 0;
    startTimeRef.current = null;

    // Add initial log
    const addLog = (text: string, type: string) => {
      setLogs((prev) => [
        ...prev,
        { id: Math.random().toString(36).substring(2, 9), text, type },
      ]);
    };

    addLog("BREAKER V2: SISTEMA INICIADO COM SUCESSO.", "success");

    // Interval to stream hacking terminal logs
    const logsInterval = setInterval(() => {
      if (logIndexRef.current < HACKER_LOGS_TEMPLATES.length) {
        const item = HACKER_LOGS_TEMPLATES[logIndexRef.current];
        addLog(item.text, item.type);
        logIndexRef.current++;
      } else {
        clearInterval(logsInterval);
      }
    }, 280);

    // requestAnimationFrame balance counter and progress bar animation
    // The duration is 6.5 seconds (6500ms)
    const duration = 6500;
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth progress calculation
      setCurrentProgress(Math.floor(progress * 100));

      // Balance counts up from 1,000 to 10,000 using cubic ease-out for realistic organic movement
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const balanceValue = 1000 + easeOutCubic * 9000;
      setCurrentBalance(Math.floor(balanceValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Complete state
        setCurrentProgress(100);
        setCurrentBalance(10000);
        setStage('completed');
        playSuccessSound();
      }
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      clearInterval(logsInterval);
      cancelAnimationFrame(animationId);
    };
  }, [isOpen]);

  // Autoscroll terminal
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div 
      id="hacker-exploit-overlay"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto"
    >
      {/* Top Banner Warning */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-emerald-500/30 pb-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <h2 className="text-red-500 font-display font-bold tracking-wider text-sm sm:text-base animate-pulse">
            BREAKER_V2.EXE INJETANDO VETOR DE EXPLORAÇÃO
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-emerald-500/80 font-mono text-xs">
          <Terminal size={14} />
          <span>PORT: 3000 / ENCRYPTION: SECURE</span>
        </div>
      </div>

      {/* Main Grid: Left is Logs, Right is active counter status */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full max-w-4xl">
        
        {/* Terminal Logs (3 cols) */}
        <div className="lg:col-span-3 bg-black/80 border border-emerald-500/30 rounded-xl p-4 font-mono text-xs h-[250px] sm:h-[350px] flex flex-col glow-green shadow-black">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-3 text-emerald-500/60 font-semibold">
            <div className="flex items-center gap-1.5">
              <Cpu size={12} className="animate-spin text-emerald-400" />
              <span>TERMINAL DE INTRUSÃO</span>
            </div>
            <span className="text-[10px]">REDE ESTÁVEL</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none">
            {logs.map((log) => {
              let colorClass = "text-emerald-400/80";
              let prefix = "> ";
              if (log.type === "error") {
                colorClass = "text-red-400 font-bold";
                prefix = "[!] ";
              } else if (log.type === "warning") {
                colorClass = "text-yellow-400";
                prefix = "[?] ";
              } else if (log.type === "success") {
                colorClass = "text-emerald-400 font-bold";
                prefix = "[✓] ";
              } else if (log.type === "critical") {
                colorClass = "text-emerald-300 font-bold underline animate-pulse";
                prefix = "[⚡] ";
              }

              return (
                <div key={log.id} className={`${colorClass} leading-relaxed`}>
                  <span>{prefix}</span>
                  <TypewriterText text={log.text} speed={5} />
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>

          <div className="border-t border-emerald-500/20 pt-2 mt-2 flex justify-between items-center text-[10px] text-emerald-500/40">
            <span>EXECUTANDO PAYLOAD</span>
            <span className="animate-pulse">DIGITAL_RAIN_ACTIVE</span>
          </div>
        </div>

        {/* Live Balance Increment Counter (2 cols) */}
        <div className="lg:col-span-2 bg-emerald-950/20 border-2 border-emerald-500 rounded-xl p-6 flex flex-col justify-between text-center relative overflow-hidden glow-green shadow-black">
          {/* Subtle grid mesh overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          {/* Spark effect when finished */}
          {stage === 'completed' && (
            <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
          )}

          <div className="space-y-4">
            <span className="inline-block text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
              {stage === 'running' ? 'Injetando Saldo...' : 'Injeção Concluída'}
            </span>

            <div className="py-6 space-y-2">
              <span className="block text-emerald-500/60 font-mono text-xs uppercase tracking-wider">
                Saldo Adicionado
              </span>
              <div className="text-4xl sm:text-5xl font-display font-extrabold text-emerald-400 text-glow-green select-none transition-all duration-75">
                R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Progress metrics */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-emerald-500/70">STATUS DA CARGA</span>
                <span className="text-emerald-400 font-bold">{currentProgress}%</span>
              </div>
              <div className="h-3 bg-black/60 rounded-full border border-emerald-500/30 overflow-hidden p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-300 rounded-full glow-green transition-all duration-100 ease-out"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>

            {/* Stage Actions */}
            {stage === 'running' ? (
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-500/80 animate-pulse py-2">
                <ShieldAlert size={14} className="text-emerald-400" />
                <span>NÃO FECHE ESTA PÁGINA OU JANELA</span>
              </div>
            ) : (
              <button
                id="btn-confirm-exploit"
                onClick={() => onSuccess(10000)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-display font-extrabold tracking-wider text-sm py-3.5 px-4 rounded-lg shadow-lg hover:shadow-emerald-500/20 active:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                CONCLUIR INJEÇÃO DE SALDO
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Warnings & Terms */}
      <div className="w-full max-w-4xl mt-8 text-center text-[11px] font-mono text-emerald-500/40 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 border-t border-emerald-500/10 pt-4">
        <div className="flex items-center gap-1">
          <AlertTriangle size={12} className="text-yellow-500" />
          <span>Acesso autorizado. Criptografia ativa.</span>
        </div>
        <span>UUID: {Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
      </div>
    </div>
  );
}
