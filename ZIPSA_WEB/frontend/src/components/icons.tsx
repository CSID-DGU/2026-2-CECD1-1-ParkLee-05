const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function MicIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" {...stroke} strokeWidth={2}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
}

export function SendIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} strokeWidth={2.4}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
}

/* 가족 앱 탭 아이콘 */
const tab = { width: 18, height: 18, viewBox: '0 0 24 24', strokeWidth: 1.8, ...stroke };

export function ChatIcon() {
  return <svg {...tab}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>;
}

export function GroupIcon() {
  return <svg {...tab}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.6M17.5 13.7A5.5 5.5 0 0 1 20.5 19" /></svg>;
}

export function RhythmIcon() {
  return <svg {...tab}><path d="M3 12h4l2.5-6 5 12 2.5-6h4" /></svg>;
}

export function CareIcon() {
  return <svg {...tab}><path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" /></svg>;
}

export function GuardIcon() {
  return <svg {...tab}><path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z" /></svg>;
}
