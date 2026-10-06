import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Typing } from '../../components/Thread';
import { useMessages } from '../../components/useMessages';
import type { NewMessage } from '../../components/useMessages';
import { INITIAL_ROBOTS, ROBOT_AVATAR } from '../../data/robots';
import type { Robot } from '../../data/robots';
import { eta } from '../../lib/format';
import { speak, stopSpeaking } from '../../lib/speech';
import { saveTab, speakerOf, tabPath } from './homeContext';
import type { ActionId, SpeakerId, TabId } from './homeContext';
import { CHAT_FALLBACK, matchIntent } from './intents';

/** 단톡방 말풍선. 집사는 조율 메시지로 표시한다. */
function robotMessage(id: string, text: string, proto: string): NewMessage {
  const isZipsa = id === '집사';
  return { who: isZipsa ? '집사 (조율)' : id, av: isZipsa ? '집' : id, avStyle: ROBOT_AVATAR[id], body: text, proto };
}

const INITIAL_CHAT: NewMessage[] = [
  {
    body: (
      <>
        <p>좋은 오후예요. 오늘 작업 24건 중 21건을 마쳤고, <b>확인이 필요한 건 하나</b>예요. D4가 작은방에서 멈춰 있어요.</p>
        <p className="mut sm" style={{ margin: 0 }}>아래 질문을 누르거나 마이크로 말해 보세요.</p>
      </>
    ),
  },
];

const INITIAL_GROUP: NewMessage[] = [
  robotMessage('A1', '설거지 시작합니다. 주방은 14:25까지 제가 쓸게요.', 'F-10 zone.lock {zone:"kitchen", by:"A1", until:"14:25"}'),
  robotMessage('B2', '알겠어요. 거실 끝나면 주방은 14:30 이후에 들어갈게요.', 'F-11 plan.update {robot:"B2", after:"14:30"}'),
  robotMessage('D4', '작은방 3구역에서 빨래 바구니에 부딪혔어요. 3.2G 충격, 안전하게 멈췄습니다.', 'F-04 alarm.collision {robot:"D4", g:3.2, zone:"room2-3"}'),
  robotMessage('집사', 'D4 작업을 E5에게 넘길까요? 보호자 확인을 기다립니다.', 'F-11 reassign.pending {from:"D4", candidate:"E5"}'),
  robotMessage('C3', '배터리 12%라 충전소로 돌아왔어요. 40분 뒤에 다시 일할 수 있어요.', 'F-03 state {robot:"C3", battery:12, dock:true}'),
];

/** 가족 앱의 시연 상태와 동작. 서버 연동 전까지 모든 상태는 화면 안에만 있다.
    현재 탭은 URL(/home/:tab)에서 받는다. */
export function useFamilyHome(tab: TabId) {
  const navigate = useNavigate();
  const [robots, setRobots] = useState<Robot[]>(INITIAL_ROBOTS);
  const [awayMode, setAwayMode] = useState(false);
  const [tts, setTtsState] = useState(false);
  const [groupUnread, setGroupUnread] = useState(false);
  const [speaker, setSpeaker] = useState<SpeakerId>('guardian');
  const chat = useMessages(INITIAL_CHAT);
  const group = useMessages(INITIAL_GROUP);
  const { add: addChat, update: updateChat } = chat;
  const { add: addGroup } = group;

  // 타이머 안에서 최신 값을 읽기 위한 참조
  const robotsRef = useRef(robots);
  const tabRef = useRef(tab);
  const ttsRef = useRef(tts);
  useEffect(() => { robotsRef.current = robots; }, [robots]);
  useEffect(() => { tabRef.current = tab; saveTab(tab); }, [tab]);

  // 단톡방에 들어오면 (탭 버튼이든 뒤로 가기든) 읽지 않음 표시를 끈다
  const [seenTab, setSeenTab] = useState(tab);
  if (seenTab !== tab) {
    setSeenTab(tab);
    if (tab === 'group') setGroupUnread(false);
  }

  /** 음성 답변이 켜져 있거나 음성으로 물었을 때만 읽는다 */
  const say = useCallback((text: string, force = false) => {
    if (ttsRef.current || force) speak(text);
  }, []);

  const setTts = useCallback((on: boolean) => {
    ttsRef.current = on;
    setTtsState(on);
    if (on) speak('음성 답변을 켰어요.');
    else stopSpeaking();
  }, []);

  const showTab = useCallback((t: TabId) => {
    tabRef.current = t;
    navigate(tabPath(t));
  }, [navigate]);

  const patchRobot = useCallback((id: string, patch: Partial<Robot>) => {
    setRobots(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  /** 단톡방에 로봇 메시지를 올린다. notify면 다른 탭에 있을 때 읽지 않음 표시를 켠다. */
  const robotSay = useCallback((id: string, text: string, proto: string, notify = false) => {
    addGroup(robotMessage(id, text, proto));
    if (notify && tabRef.current !== 'group') setGroupUnread(true);
  }, [addGroup]);

  const runAction = useCallback((action: ActionId) => {
    switch (action) {
      case 'd4-handoff':
        patchRobot('E5', { task: '작은방 정리', zone: '작은방', status: 'run' });
        patchRobot('D4', { task: '대기 (바구니 치운 뒤 재개)' });
        addChat({ body: <p>E5에게 넘겼어요. 예상 완료 {eta(25)}. D4는 바구니가 치워지면 스스로 복귀합니다.</p> });
        say('E5에게 넘겼어요.');
        robotSay('집사', '보호자 승인. D4의 작은방 정리를 E5에게 재할당합니다.', 'F-11 task.reassign {from:"D4", to:"E5", zone:"room2"}', true);
        robotSay('E5', '넘겨받았어요. 바구니는 피해서 진행할게요.', 'F-10 zone.enter {robot:"E5", avoid:"obstacle#31"}', true);
        break;
      case 'd4-resume':
        patchRobot('D4', { status: 'run', task: '작은방 정리' });
        addChat({ body: <p>고마워요. D4가 통로를 다시 확인했고 작업을 재개했어요. 이 위치는 "자주 막히는 곳"으로 기억해 둘게요.</p> });
        say('D4가 작업을 재개했어요.');
        robotSay('D4', '통로 확보 확인. 재개합니다. 도와주셔서 감사해요.', 'F-05 cmd.resume {robot:"D4"} · map.note {zone:"room2-3", type:"clutter"}', true);
        break;
      case 'why-e5':
        addChat({ body: <p><b>왜 E5인가요?</b> ① 지금 대기 중인 유일한 로봇이고 ② 배터리 91%로 가장 여유 있고 ③ 작은방으로 가는 길에 다른 로봇과 겹치는 구역이 없어요. A1은 설거지 중이라 주방을 비울 수 없고, C3는 12%라 충전이 먼저예요.</p> });
        break;
      case 'approve-task':
        patchRobot('E5', { task: '요청 작업 수행', status: 'run' });
        addChat({ body: <p>E5가 시작했어요. 끝나면 알려드릴게요.</p> });
        robotSay('E5', '보호자 요청 접수. 조용한 모드로 시작합니다.', 'F-07 task.create {robot:"E5", mode:"quiet"}', true);
        break;
      case 'vent-on':
        addChat({ body: <p>오늘 밤부터 안방 CO₂가 1,500ppm을 넘으면 전열교환기를 약하게 켤게요. 소음은 속삭임 수준(24dB)입니다.</p> });
        break;
      case 'laundry-yes':
        addChat({ body: <p>내일 07:10에 A1이 세탁물을 넣고 돌릴게요. 끝나면 건조기로 옮길지 물어볼게요.</p> });
        break;
      case 'away-on':
        setAwayMode(true);
        addChat({ body: <p>외출 모드를 켰어요. 가디언 감도도 한 단계 올렸습니다.</p> });
        break;
    }
  }, [addChat, patchRobot, robotSay, say]);

  /** 대화 탭에 질문을 보내고 준비된 답변으로 응답한다 */
  const sendChat = useCallback((question: string, viaVoice = false) => {
    addChat({
      me: true,
      body: viaVoice ? <><span style={{ opacity: 0.75, fontSize: 11 }}>음성 · {speakerOf(speaker).label}</span><br />{question}</> : question,
    });
    const pendingId = addChat({ body: <Typing /> });
    const hasReply = matchIntent(question, robotsRef.current) !== null;
    setTimeout(() => {
      const reply = matchIntent(question, robotsRef.current);
      updateChat(pendingId, reply ? reply.body : CHAT_FALLBACK);
      say(reply ? reply.say : CHAT_FALLBACK, viaVoice);
    }, hasReply ? 650 : 50);
  }, [addChat, updateChat, say, speaker]);

  /** 단톡방에 가족 메시지를 보낸다. @로 지목한 로봇(없으면 E5)이 상태에 맞게 답한다. */
  const sendGroup = useCallback((text: string) => {
    addGroup({ me: true, body: text });
    const id = text.match(/([A-Ea-e][1-5])/)?.[1].toUpperCase() ?? 'E5';
    setTimeout(() => {
      const rs = robotsRef.current;
      const r = rs.find(x => x.id === id) ?? rs.find(x => x.id === 'E5');
      if (!r) return;
      if (r.status === 'err') {
        robotSay(r.id, '저는 아직 멈춰 있어요. 바구니만 치워 주시면 바로 재개할게요.', 'F-05 cmd.rejected {reason:"safety_hold"}');
      } else if (r.status === 'charge') {
        robotSay(r.id, `지금 ${r.battery}%라 충전이 먼저예요. E5에게 부탁드려도 될까요?`, 'F-11 decline {reason:"battery"}');
      } else if (/정리|청소|해줘|부탁|치워|닦/.test(text)) {
        patchRobot(r.id, { status: 'run', task: '요청 작업 수행' });
        robotSay(r.id, `네, 바로 시작할게요. 예상 완료 ${eta(20)}.`, `F-07 task.create {robot:"${r.id}", src:"family_chat"}`);
      } else {
        robotSay(r.id, '확인했습니다.', 'F-13 event.ack');
      }
    }, 600);
  }, [addGroup, patchRobot, robotSay]);

  return {
    tab, showTab,
    robots,
    awayMode, setAwayMode,
    tts, setTts,
    groupUnread,
    speaker, setSpeaker,
    chatMessages: chat.messages,
    groupMessages: group.messages,
    runAction, sendChat, sendGroup,
  };
}
