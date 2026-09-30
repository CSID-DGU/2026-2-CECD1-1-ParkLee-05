import { useEffect, useRef, useState } from 'react';
import { FloorPlan } from '../../components/FloorPlan';
import { PageHeader } from '../../components/PageHeader';
import { Toggle } from '../../components/Toggle';
import { GUARDIAN_FLAGS, SCENARIO } from '../../data/guardianScenario';
import { speak, stopSpeaking } from '../../lib/speech';
import '../../styles/stage.css';

const LAST = SCENARIO.length - 1;
/** 자동 재생 간격 (ms) */
const STEP_INTERVAL = 4200;
const LADDER = ['관찰', '가족 무음 확인', '가디언 발동'];
const IDLE_ROBOT: [number, number] = [150, 120];
const INTRUDER_START: [number, number] = [35, 172];

/** 가디언 시연 (/stage). 왼쪽은 침입자가 보는 것, 오른쪽은 실제로 일어나는 일. */
export default function StagePage() {
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [tts, setTts] = useState(false);
  const ttsRef = useRef(tts);

  useEffect(() => { document.title = 'ZIPSA · 가디언 시연'; }, []);
  useEffect(() => { ttsRef.current = tts; }, [tts]);
  useEffect(() => () => stopSpeaking(), []);

  // 마지막 단계에 도착하면 자동 재생이 멈춘다
  const isPlaying = playing && index < LAST;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => setIndex(i => Math.min(i + 1, LAST)), STEP_INTERVAL);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // 단계가 바뀌면 로봇 대사를 읽는다
  useEffect(() => {
    const say = index >= 0 ? SCENARIO[index].say : undefined;
    if (ttsRef.current && say) speak(say);
  }, [index]);

  function play() {
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    setIndex(i => (i >= LAST ? 0 : i + 1));
    setPlaying(true);
  }
  function next() {
    setPlaying(false);
    setIndex(i => Math.min(i + 1, LAST));
  }
  function reset() {
    setPlaying(false);
    setIndex(-1);
    stopSpeaking();
  }

  const step = index >= 0 ? SCENARIO[index] : null;
  const robot = step?.robot ?? IDLE_ROBOT;
  const subtitles = SCENARIO.slice(0, index + 1).flatMap(s => s.subtitles).slice(-3);
  const side = SCENARIO.slice(0, index + 1).reverse().find(s => s.side)?.side;
  const intruder = step?.intruder ?? INTRUDER_START;
  const playLabel = isPlaying ? '일시정지' : index >= LAST ? '다시 재생' : '시연 재생';

  return (
    <div className="wrap">
      <PageHeader />
      <div className="eyebrow">CES 메인 시연 · 가디언 모드</div>
      <h2>침입자가 보는 집과, 실제로 일어나는 일</h2>

      <div className="gctl">
        <div className="row">
          <button type="button" className="btn pri" onClick={play}>{playLabel}</button>
          <button type="button" className="btn" onClick={next} disabled={index >= LAST}>다음 단계</button>
          <button type="button" className="btn" onClick={reset}>처음부터</button>
          <span className="row sm mut">
            <Toggle checked={tts} label="로봇 대사 음성 재생" onChange={on => { setTts(on); if (!on) stopSpeaking(); }} />
            로봇 대사 음성
          </span>
        </div>
        <div className="row">
          <span className="num sm mut">{step ? step.clock : '02:14:00'}</span>
          <div className="steps">{SCENARIO.map((_, i) => <i key={i} className={i <= index ? 'on' : ''} />)}</div>
        </div>
      </div>

      <div className="split">
        <div className="lie">
          <div className="tag">침입자가 보고 듣는 것</div>
          <div>
            <div className={step?.off ? 'visor off' : 'visor'}><div className="eye" /><div className="eye" /></div>
            <div className="pwr">{step?.off ? '전원 꺼짐 (으로 보임)' : ''}</div>
          </div>
          <div className="subs">
            {subtitles.length ? subtitles.map(([who, text], i) => (
              <div key={index + '-' + i} className={'sub ' + who}><small>{who === 'robot' ? '로봇 A1' : '침입자'}</small>{text}</div>
            )) : (
              <div className="sub robot"><small>대기</small>집 안은 조용합니다. 02:14, 가족은 안방에서 자고 있습니다.</div>
            )}
          </div>
        </div>

        <div className="truth">
          <div className="tag">실제로 일어나는 일</div>
          <div className="ladder" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
            {LADDER.map((label, i) => (
              <div key={label} className={step && i <= step.ladder ? (i === 2 ? 'hot' : 'on') : ''}>{label}</div>
            ))}
          </div>
          <div className="flags">
            {GUARDIAN_FLAGS.map((f, i) => <div key={f} className={step?.flags.includes(i) ? 'flag on' : 'flag'}>{f}</div>)}
          </div>
          <div className="tgrid">
            <div className="plan">
              <FloorPlan marks={[
                { id: 'f1', x: 258, y: 48, color: 'var(--s1)', r: 5 },
                { id: 'f2', x: 274, y: 62, color: 'var(--s1)', r: 5 },
                { id: 'f3', x: 288, y: 44, color: 'var(--s1)', r: 5 },
                { id: 'bot', x: robot[0], y: robot[1], color: 'var(--amber)', label: 'A1' },
                { id: 'intr', x: intruder[0], y: intruder[1], color: 'var(--crit)', r: 7, hidden: !step?.intruder },
              ]} />
              <div className="keys" style={{ marginTop: 6 }}>
                <span><i style={{ background: 'var(--crit)' }} />침입자</span>
                <span><i style={{ background: 'var(--s1)' }} />가족 3명</span>
                <span><i style={{ background: 'var(--amber)' }} />로봇 A1</span>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
              {side ?? <div className="notif"><b>가족 3명</b>안방에서 취침 중 · 워치 착용</div>}
            </div>
          </div>
          <StageLog index={index} />
        </div>
      </div>

      <div className="principles">
        <div><b>들키지 않는다</b>표시등·다이얼음·화면 변화가 없습니다. 기만이 드러나면 더 위험해지기 때문입니다.</div>
        <div><b>맞서지 않는다</b>로봇은 물리적으로 대응하지 않고 출구도 막지 않습니다. 목표는 시간과 거리입니다.</div>
        <div><b>판단은 규칙이 한다</b>발동과 신고는 규칙 기반 상태기계가 결정합니다. 언어 모델은 제약 안에서 대사만 만듭니다.</div>
        <div><b>가족에게는 거짓말하지 않는다</b>가디언 모드의 모든 발화는 서명되어 기록되고, 성인 가족 전원이 사후에 열람합니다.</div>
      </div>
    </div>
  );
}

/** 시연 로그. 새 단계의 줄은 잠깐 강조하고 맨 아래로 스크롤한다. */
function StageLog({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [index]);

  const lines = SCENARIO.slice(0, index + 1).flatMap((s, i) => s.log.map((text, j) => ({ key: i + '-' + j, clock: s.clock, text, fresh: i === index })));
  return (
    <div className="tlog" ref={ref}>
      {lines.length ? lines.map(l => (
        <div key={l.key} className={l.fresh ? 'new' : ''}><time>{l.clock}</time><span>{l.text}</span></div>
      )) : (
        <div><time>02:14:00</time><span>가디언 대기 중 · 이상 없음</span></div>
      )}
    </div>
  );
}
