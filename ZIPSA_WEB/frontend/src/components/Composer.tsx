import { useState } from 'react';
import { MicIcon, SendIcon } from './icons';

interface ComposerProps {
  placeholder: string;
  label: string;
  onSend: (text: string) => void;
  /** 넘기면 마이크 버튼을 표시한다 */
  onMic?: () => void;
}

export function Composer({ placeholder, label, onSend, onMic }: ComposerProps) {
  const [value, setValue] = useState('');
  return (
    <form
      className="composer"
      onSubmit={e => {
        e.preventDefault();
        const text = value.trim();
        setValue('');
        if (text) onSend(text);
      }}
    >
      {onMic && <button type="button" className="mic" aria-label="음성으로 말하기" onClick={onMic}><MicIcon /></button>}
      <input value={value} onChange={e => setValue(e.target.value)} autoComplete="off" placeholder={placeholder} aria-label={label} />
      <button className="send" aria-label="보내기"><SendIcon /></button>
    </form>
  );
}

export function Chips({ items, onPick }: { items: string[]; onPick: (text: string) => void }) {
  return (
    <div className="chips">
      {items.map(t => <button type="button" key={t} onClick={() => onPick(t)}>{t}</button>)}
    </div>
  );
}
