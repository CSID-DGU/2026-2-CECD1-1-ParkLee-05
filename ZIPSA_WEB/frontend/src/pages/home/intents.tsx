import type { ReactNode } from 'react';
import { FloorPlan } from '../../components/FloorPlan';
import { Pill } from '../../components/Pill';
import type { Robot } from '../../data/robots';
import { eta } from '../../lib/format';
import { ActButton, StageButton, TabButton } from './HomeButtons';

/** 준비된 답변. say는 음성으로 읽을 문장, body는 화면에 표시할 내용 */
export interface IntentReply {
  say: string;
  body: ReactNode;
}

interface Intent {
  pattern: RegExp;
  reply: (question: string, robots: Robot[]) => IntentReply;
}

export const CHAT_SUGGESTIONS = ['D4 왜 멈췄어?', '어머니 오늘 어떠셔?', '환기 필요해?', '작은방 정리 좀 해줘', '내일 빨래는?', '주말에 집 비워'];

export const CHAT_FALLBACK = '이 시연에서는 아래 추천 질문처럼 로봇 상태, 어머니 안부, 환기, 빨래 습관, 외출, 가디언에 대해 답할 수 있어요.';

function robotsCard(robots: Robot[]) {
  return (
    <div className="card">
      <h4>로봇 {robots.length}대</h4>
      <div className="kv">
        {robots.map(r => [
          <span key={r.id + 'l'}>{r.id} · {r.task} <span className="mut">({r.zone})</span></span>,
          <span key={r.id + 'v'}>{r.battery}%</span>,
        ])}
      </div>
    </div>
  );
}

/** 질문 분류 규칙. 위에서부터 먼저 맞는 규칙을 쓴다. */
const INTENTS: Intent[] = [
  {
    pattern: /d4|멈췄|멈춘|에러|충돌|왜.*(섰|안)/i,
    reply: () => ({
      say: 'D4는 작은방에서 빨래 바구니에 부딪혀 멈췄어요. 바구니를 치워 주시거나, 대기 중인 E5에게 넘길 수 있어요.',
      body: (
        <>
          <p>D4는 14:21에 작은방 3구역에서 <b>빨래 바구니에 부딪혀</b> 스스로 멈췄어요. 다친 곳은 없고, 바구니가 통로를 막고 있어서 혼자서는 재개하지 않았습니다.</p>
          <div className="card">
            <h4>무슨 일이 있었나 <Pill tone="crit">멈춤</Pill></h4>
            <div className="plan" style={{ padding: 4 }}>
              <FloorPlan marks={[{ id: 'd4', x: 60, y: 112, color: 'var(--crit)', label: 'D4' }, { id: 'e5', x: 150, y: 170, color: 'var(--amber)', label: 'E5' }]} />
            </div>
            <div className="logl">
              <span>14:21:58</span><span>충격센서 3.2G</span>
              <span>14:21:57</span><span>Lidar 0.3m 장애물</span>
              <span>14:21:58</span><span>안전 정지 · 작업 보류</span>
            </div>
            <div className="row">
              <ActButton act="d4-handoff" primary>E5에게 넘기기</ActButton>
              <ActButton act="d4-resume">치웠어요, 재개</ActButton>
              <ActButton act="why-e5">왜 E5?</ActButton>
            </div>
          </div>
        </>
      ),
    }),
  },
  {
    pattern: /어머니|엄마|부모|할머니|안부/,
    reply: () => ({
      say: '어머니는 평소와 비슷하게 지내고 계세요. 12분 전에도 냉장고를 여셨어요.',
      body: (
        <>
          <p>어머니는 <b>평소와 비슷하게</b> 지내고 계세요. 카메라 없이 가전 사용만으로 확인했어요.</p>
          <div className="card">
            <h4>어머니 댁 · 오늘 <Pill tone="good">평소와 같음</Pill></h4>
            <div className="kv">
              <span>냉장고 문 열림</span><span>22회 (평소 24)</span>
              <span>쿡탑 사용</span><span>2회 · 점심 12:10</span>
              <span>마지막 활동</span><span>12분 전</span>
            </div>
            <div className="row"><TabButton tab="care">안부 화면 열기</TabButton></div>
          </div>
        </>
      ),
    }),
  },
  {
    pattern: /환기|공기|co2|co₂|이산화|답답/i,
    reply: () => ({
      say: '간밤에 안방 이산화탄소가 2,640ppm까지 올랐어요. 오늘 밤부터 자동 환기를 켤까요?',
      body: (
        <>
          <p>간밤에 안방 CO₂가 <b className="num">2,640ppm</b>까지 올랐어요. 2,000ppm을 넘으면 아침에 머리가 무거울 수 있어요. 오늘 밤부터 1,500ppm에서 전열교환기를 조용히 돌릴까요?</p>
          <div className="row" style={{ marginTop: 6 }}><ActButton act="vent-on" primary>오늘 밤부터 켜기</ActButton></div>
        </>
      ),
    }),
  },
  {
    pattern: /빨래|세탁/,
    reply: () => ({
      say: '이 집은 아침 일곱 시에서 아홉 시 사이에 빨래를 하는 집이에요. 내일 아침에 맞춰 돌려둘까요?',
      body: (
        <>
          <p>이 집은 <b>아침 빨래 집</b>이에요. 세탁의 46%가 오전 7~9시에 몰려 있고, 다른 집 평균과는 거의 닮지 않았어요(r=0.26). 내일 07:10에 맞춰 A1이 세탁물을 넣어 둘까요?</p>
          <div className="row" style={{ marginTop: 6 }}>
            <ActButton act="laundry-yes" primary>내일 아침에 해줘</ActButton>
            <TabButton tab="rhythm">리듬 보기</TabButton>
          </div>
        </>
      ),
    }),
  },
  {
    pattern: /외출|여행|부재|집 비|나갈/,
    reply: () => ({
      say: '외출 모드를 켤게요. 평소 이 집의 리듬대로 조명과 TV를 움직여서 빈집처럼 보이지 않게 할게요.',
      body: (
        <>
          <p>외출 모드를 켤게요. 무작위 타이머가 아니라 <b>이 집의 실제 리듬</b>대로 조명·TV를 움직여 빈집처럼 보이지 않게 합니다.</p>
          <div className="row" style={{ marginTop: 6 }}>
            <ActButton act="away-on" primary>외출 모드 켜기</ActButton>
            <TabButton tab="rhythm">계획 보기</TabButton>
          </div>
        </>
      ),
    }),
  },
  {
    pattern: /가디언|침입|강도|도둑|보안|안전/,
    reply: () => ({
      say: '가디언 모드는 대기 중이에요. 이상 징후는 없습니다.',
      body: (
        <>
          <p>가디언 모드는 <b>대기 중</b>이고 이상 징후는 없어요. 현관·창문 센서 정상, 가족 암호문 설정됨, 신고 경로는 인증 관제센터를 거칩니다.</p>
          <div className="row" style={{ marginTop: 6 }}>
            <TabButton tab="guard">설정 보기</TabButton>
            <StageButton>시연 보기</StageButton>
          </div>
        </>
      ),
    }),
  },
  {
    pattern: /정리|청소|치워|닦아|해\s?줘/,
    reply: q => ({
      say: 'E5에게 맡길게요. 지금 대기 중이고 배터리가 가장 많아요. 시작할까요?',
      body: (
        <>
          <p>"{q}" 요청이죠. <b>E5</b>에게 맡기는 걸 추천해요. 지금 대기 중이고 배터리 91%예요.</p>
          <div className="card">
            <h4>작업 제안</h4>
            <div className="kv">
              <span>담당</span><span>E5</span>
              <span>예상 완료</span><span>{eta(25)}</span>
              <span>조용한 모드</span><span>켜짐 (귀가 직후)</span>
            </div>
            <div className="row">
              <ActButton act="approve-task" primary>시작</ActButton>
              <ActButton act="why-e5">왜 E5?</ActButton>
            </div>
          </div>
        </>
      ),
    }),
  },
  {
    pattern: /오늘|요약|브리핑|어땠|상태|로봇/,
    reply: (_q, robots) => ({
      say: '오늘 작업 24건 중 21건을 마쳤어요. 확인이 필요한 건 D4 하나예요.',
      body: (
        <>
          <p>오늘 작업 24건 중 <b>21건 완료</b>, 3건은 다시 시도했어요. 확인이 필요한 건 작은방에서 멈춘 D4 하나예요.</p>
          {robotsCard(robots)}
        </>
      ),
    }),
  },
];

/** 질문에 맞는 준비된 답변. 맞는 규칙이 없으면 null */
export function matchIntent(question: string, robots: Robot[]): IntentReply | null {
  const hit = INTENTS.find(i => i.pattern.test(question));
  return hit ? hit.reply(question, robots) : null;
}
