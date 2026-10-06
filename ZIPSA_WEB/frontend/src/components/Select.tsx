import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** 목록에서 이름 옆에 흐리게 붙는 설명 (권한 등급 등) */
  hint?: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** 접근성 이름. prefix가 없으면 화면에는 보이지 않는다. */
  label: string;
  /** 버튼 안 선택값 앞에 흐리게 붙는 짧은 이름 (예: "화자") */
  prefix?: string;
  className?: string;
}

/** .seg와 같은 알약 모양의 드롭다운. 네이티브 select 대신 목록 스타일을 맞추려고 쓴다. */
export function Select<T extends string>({ value, options, onChange, label, prefix, className }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selectedIndex = Math.max(0, options.findIndex(o => o.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const openList = () => { setActive(selectedIndex); setOpen(true); };
  const close = () => { setOpen(false); buttonRef.current?.focus(); };
  const choose = (i: number) => { onChange(options[i].value); close(); };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList(); }
  };

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    if (e.key === 'ArrowDown') setActive(i => Math.min(last, i + 1));
    else if (e.key === 'ArrowUp') setActive(i => Math.max(0, i - 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(last);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Escape' || e.key === 'Tab') { if (e.key === 'Escape') close(); else setOpen(false); return; }
    else return;
    e.preventDefault();
  };

  return (
    <div ref={rootRef} className={className ? `select ${className}` : 'select'}>
      <button
        ref={buttonRef}
        type="button"
        className="select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${selected.label}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKey}
      >
        {prefix && <span className="mut">{prefix}</span>}
        <b>{selected.label}</b>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="select-list"
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              data-active={i === active || undefined}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <span>{o.label}</span>
              {o.hint && <span className="sm mut">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
