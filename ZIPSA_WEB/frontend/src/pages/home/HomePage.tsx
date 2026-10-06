import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { CareIcon, ChatIcon, GroupIcon, GuardIcon, RhythmIcon } from '../../components/icons';
import { PageHeader } from '../../components/PageHeader';
import { Select } from '../../components/Select';
import { Toggle } from '../../components/Toggle';
import '../../styles/home.css';
import { HomeContext, SPEAKERS, speakerOf } from './homeContext';
import type { TabId } from './homeContext';
import { RobotCard } from './RobotCard';
import { CareScreen } from './screens/CareScreen';
import { ChatScreen } from './screens/ChatScreen';
import { GroupScreen } from './screens/GroupScreen';
import { GuardScreen } from './screens/GuardScreen';
import { RhythmScreen } from './screens/RhythmScreen';
import { useFamilyHome } from './useFamilyHome';
import { VoiceOverlay } from './VoiceOverlay';

const SPEAKER_OPTIONS = SPEAKERS.map(s => ({ value: s.id, label: s.label, hint: s.level }));

const TABS: { id: TabId; label: string; Icon: ComponentType }[] = [
  { id: 'chat', label: '대화', Icon: ChatIcon },
  { id: 'group', label: '단톡방', Icon: GroupIcon },
  { id: 'rhythm', label: '리듬', Icon: RhythmIcon },
  { id: 'care', label: '안부', Icon: CareIcon },
  { id: 'guard', label: '가디언', Icon: GuardIcon },
];

/** 가족 앱 (/home). 다섯 화면을 한 경로 안에서 탭으로 전환한다. */
export default function HomePage() {
  const home = useFamilyHome();
  const { tab, showTab, robots, tts, setTts, groupUnread, runAction, sendChat, speaker, setSpeaker } = home;
  const [voiceOpen, setVoiceOpen] = useState(false);

  useEffect(() => { document.title = 'ZIPSA · 우리 집'; }, []);

  const actions = useMemo(() => ({ runAction, showTab }), [runAction, showTab]);
  const needsCheck = robots.filter(r => r.status === 'err').length;
  const summary = `로봇 ${robots.length} · 확인 필요 ${needsCheck}`;

  const finishVoice = useCallback((text: string) => {
    setVoiceOpen(false);
    showTab('chat');
    sendChat(text, true);
  }, [showTab, sendChat]);

  const unreadDot = <span className="dot" aria-label="새 메시지" />;
  const ttsToggle = <Toggle checked={tts} onChange={setTts} label="음성으로 답변 읽기" />;
  const current = speakerOf(speaker);

  return (
    <HomeContext.Provider value={actions}>
      <div className="home-shell">
        <PageHeader className="home-top">
          <Select label="화자 선택" prefix="화자" value={speaker} options={SPEAKER_OPTIONS} onChange={setSpeaker} />
        </PageHeader>
        <div className="home">
          <nav className="home-nav" aria-label="가족 앱 메뉴">
            <div className="home-id">
              <b>우리 집</b>
              <span className="sm mut">{summary}</span>
            </div>
            <div className="home-tabs">
              {TABS.map(({ id, label, Icon }) => (
                <button key={id} type="button" aria-pressed={tab === id} onClick={() => showTab(id)}>
                  <Icon />{label}{id === 'group' && groupUnread && unreadDot}
                </button>
              ))}
            </div>
            <div className="sw"><span className="sm">음성 답변</span>{ttsToggle}</div>
          </nav>

          <main className="home-main">
            <header className="home-head">
              <div><b>우리 집</b> <span className="mut sm">{summary}</span></div>
              <div className="row"><span className="sm mut">음성 답변</span>{ttsToggle}</div>
            </header>
            <ChatScreen active={tab === 'chat'} messages={home.chatMessages} onSend={sendChat} onMic={() => setVoiceOpen(true)} />
            <GroupScreen active={tab === 'group'} robots={robots} messages={home.groupMessages} onSend={home.sendGroup} />
            <RhythmScreen active={tab === 'rhythm'} awayMode={home.awayMode} onAwayModeChange={home.setAwayMode} />
            <CareScreen active={tab === 'care'} />
            <GuardScreen active={tab === 'guard'} />
            {voiceOpen && <VoiceOverlay identified={`화자: ${current.label} · ${current.level}`} onClose={() => setVoiceOpen(false)} onFinish={finishVoice} />}
          </main>

          <aside className="home-robots" aria-label="로봇 현황">
            <h3>로봇 {robots.length}대</h3>
            {robots.map(r => <RobotCard key={r.id} robot={r} detailed />)}
          </aside>

          <nav className="home-tabbar" aria-label="앱 탭">
            {TABS.map(({ id, label }) => (
              <button key={id} type="button" aria-pressed={tab === id} onClick={() => showTab(id)}>
                {label}{id === 'group' && groupUnread && unreadDot}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </HomeContext.Provider>
  );
}
