import type { CSSProperties } from 'react';
import type { Tone } from '../components/Pill';

export type RobotStatus = 'run' | 'charge' | 'err' | 'idle';

export interface Robot {
  id: string;
  task: string;
  zone: string;
  battery: number;
  status: RobotStatus;
}

/** 시연용 예시 데이터 */
export const INITIAL_ROBOTS: Robot[] = [
  { id: 'A1', task: '설거지', zone: '주방', battery: 78, status: 'run' },
  { id: 'B2', task: '거실 청소', zone: '거실', battery: 45, status: 'run' },
  { id: 'C3', task: '충전 중', zone: '충전소', battery: 12, status: 'charge' },
  { id: 'D4', task: '충돌로 멈춤', zone: '작은방', battery: 55, status: 'err' },
  { id: 'E5', task: '대기', zone: '홈베이스', battery: 91, status: 'idle' },
];

export const ROBOT_STATUS: Record<RobotStatus, [Tone, string]> = {
  run: ['good', '가동 중'],
  charge: ['warn', '충전 중'],
  err: ['crit', '멈춤'],
  idle: ['idle', '대기'],
};

export const ROBOT_AVATAR: Record<string, CSSProperties> = {
  A1: { background: '#D9EAE3', color: '#1F6F5C' },
  B2: { background: '#DCE8F8', color: '#1c5cab' },
  C3: { background: '#F6E8D2', color: '#8a5a12' },
  D4: { background: '#F9E0DB', color: '#B93A2B' },
  E5: { background: '#E8E2F4', color: '#4a3aa7' },
};
