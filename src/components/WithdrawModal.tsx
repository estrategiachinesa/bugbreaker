/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { Landmark, ArrowRight, Check, CheckCircle2, ShieldCheck, Download, RefreshCw, X } from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onReset: () => void;
}

export default function WithdrawModal({ isOpen, onClose, balance, onReset }: WithdrawModalProps) {
  const [pixKey, setPixKey] = useState('');
  const [pixType, setPixType] = useState<'cpf' | 'email' | 'phone' | 'random'>('cpf');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [loadingStep, setLoadingStep] = useState('');
  const [txId, setTxId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPixKey('');
      setStatus('idle');
      setLoadingStep('');
      setTxId(Math.random().toString(36).substring(2, 16).toUpperCase());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Mask function for input
  const handleKeyChange = (val: string) => {
    if (pixType === 'cpf') {
      // numeric only CPF mask helper
      const digits = val.replace(/\D/g, '').slice(0, 11);
      let masked = digits;
      if (digits.length > 3) masked = digits.slice(0, 3) + '.' + digits.slice(3);
      if (digits.length > 6) masked = masked.slice(0, 7) + '.' + digits.slice(6);
      if (digits.length > 9) masked = masked.slice(0, 11) + '-' + digits.slice(9);
      setPixKey(masked);
    } else if (pixType === 'phone') {
      const digits = val.replace(/\D/g, '').slice(0, 11);
      let masked = digits;
      if (digits.length > 0) masked = '(' + digits;
      if (digits.length > 2) masked = '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
      if (digits.length > 7) masked = masked.slice(0, 10) + '-' + digits.slice(7);
      setPixKey(masked);
    } else {
      setPixKey(val);
    }
  };

  const handleWithdrawSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pixKey.trim()) return;

    setStatus('processing');
    
    const steps = [
      "Iniciando conexão com a clearing do Banco Central...",
      "Criptografando chave transacional end-to-end...",
      "Efetuando bypass de limites diários e travas de segurança...",
      "Transferindo saldo sintético de R$ 10.000,00...",
      "Confirmando autenticidade com assinatura digital BACEN...",
      "Transação aceita pela instituição emissora!"
    ];

    let currentStep = 0;
    setLoadingStep(steps[0]);

    const stepInterval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setLoadingStep(steps[currentStep]);
      } else {
        clearInterval(stepInterval);
        setStatus('success');
      }
    }, 800);
  };

  const todayStr = new Date().toLocaleString('pt-BR');

  return (
    <div 
      id="withdraw-modal-container"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-[#0b130e] border border-emerald-500/40 rounded-2xl w-full max-w-md p-6 relative overflow-hidden glow-green shadow-2xl">
        {/* Close Button */}
        <button 
          id="btn-close-withdraw"
          onClick={onClose} 
          className="absolute top-4 right-4 text-emerald-500/60 hover:text-emerald-400 cursor-pointer"
        >
          <X size={20} />
        </button>

        {status === 'idle' && (
          <form onSubmit={handleWithdrawSubmit} className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400">
                <Landmark size={20} />
                <h3 className="font-display font-bold text-lg tracking-wide uppercase">Retirada Instantânea</h3>
              </div>
              <p className="text-emerald-500/60 font-mono text-xs">
                Transfira o saldo acumulado de R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} via PIX seguro.
              </p>
            </div>

            {/* Pix Type Selectors */}
            <div className="space-y-2">
              <label className="text-emerald-400/80 font-mono text-xs uppercase block">Tipo de Chave PIX</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['cpf', 'email', 'phone', 'random'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setPixType(type);
                      setPixKey('');
                    }}
                    className={`text-center font-display font-medium text-xs py-2 rounded-lg border transition-all cursor-pointer uppercase ${
                      pixType === type
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400 glow-green'
                        : 'bg-black/40 border-emerald-500/20 text-emerald-500/50 hover:border-emerald-500/40 hover:text-emerald-400'
                    }`}
                  >
                    {type === 'phone' ? 'Tel' : type === 'random' ? 'Chave' : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Pix Key Input */}
            <div className="space-y-2">
              <label className="text-emerald-400/80 font-mono text-xs uppercase block">Digite sua Chave PIX</label>
              <input
                id="pix-key-input"
                type="text"
                required
                value={pixKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={
                  pixType === 'cpf'
                    ? '000.000.000-00'
                    : pixType === 'phone'
                    ? '(00) 00000-0000'
                    : pixType === 'email'
                    ? 'seuemail@exemplo.com'
                    : 'Chave aleatória de 32 caracteres'
                }
                className="w-full bg-black/60 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-300 placeholder-emerald-800 text-sm focus:outline-none focus:border-emerald-400 font-mono transition-all glow-green"
              />
            </div>

            {/* Information Warning */}
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3 text-[10px] text-emerald-400/70 font-mono leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck size={11} className="text-emerald-400" />
                INTEGRAÇÃO ATIVA: BANCO CENTRAL DO BRASIL
              </div>
              <p>O sistema fará o envio do comprovante de transação. Esta chave é vinculada ao processo de autenticação de rede.</p>
            </div>

            {/* Action Buttons */}
            <button
              id="btn-confirm-transfer"
              type="submit"
              disabled={!pixKey.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-display font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <span>CONFIRMAR RETIRADA DE R$ 10.000</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {status === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-950 border-t-emerald-400 rounded-full animate-spin glow-green" />
              <Landmark size={24} className="absolute inset-0 m-auto text-emerald-400 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-display font-extrabold text-emerald-400 tracking-wide text-sm uppercase">Sincronizando Pix</h4>
              <p className="text-emerald-500/80 font-mono text-xs max-w-xs animate-pulse leading-relaxed">
                {loadingStep}
              </p>
            </div>

            <div className="w-full bg-black/60 border border-emerald-500/10 rounded-lg h-2 p-0.5 max-w-xs overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full animate-[shimmer_1.5s_infinite] w-[75%]" />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="bg-emerald-950/60 border border-emerald-500 p-3 rounded-full text-emerald-400 glow-green">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="font-display font-extrabold text-emerald-400 text-lg uppercase tracking-wider">PIX ENVIADO COM SUCESSO!</h4>
              <p className="text-emerald-500/60 font-mono text-xs">A transação de rede foi liquidada.</p>
            </div>

            {/* Dynamic visual PIX Voucher (Comprovante) */}
            <div className="bg-black/80 border border-emerald-500/20 rounded-xl p-4 font-mono text-[11px] text-emerald-400/90 space-y-3 shadow-inner">
              <div className="border-b border-emerald-500/10 pb-2 flex justify-between items-center text-xs font-bold text-emerald-400">
                <span>COMPROVANTE PIX</span>
                <span>MOCK_VOUCHER</span>
              </div>

              <div className="space-y-1.5 leading-relaxed">
                <div className="flex justify-between">
                  <span className="text-emerald-500/50">VALOR:</span>
                  <span className="font-bold text-emerald-300">R$ 10.000,00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-500/50">DATA/HORA:</span>
                  <span>{todayStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-500/50">CHAVE DESTINO:</span>
                  <span className="text-emerald-300">{pixKey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-500/50">TIPO DE CHAVE:</span>
                  <span className="uppercase">{pixType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-500/50">INSTITUIÇÃO:</span>
                  <span>BROKER EXPLOIT CLEARING</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-500/50">CÓDIGO ID:</span>
                  <span className="text-[10px] text-emerald-500/80">{txId}</span>
                </div>
              </div>

              <div className="border-t border-emerald-500/10 pt-2 text-center text-[10px] text-emerald-500/40">
                TRANSACIONADO ATRAVÉS DO PROTOCOLO BROKER_BREAKER_V2
              </div>
            </div>

            {/* Bottom Actions inside voucher page */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-print-voucher"
                type="button"
                onClick={() => alert('PDF baixado para o seu dispositivo!')}
                className="bg-emerald-950/40 hover:bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 font-display font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                <span>Salvar PDF</span>
              </button>
              <button
                id="btn-restart-from-voucher"
                type="button"
                onClick={() => {
                  onReset();
                  onClose();
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-display font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
