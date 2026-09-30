import { Composer } from '../../../components/Composer';
import { Thread } from '../../../components/Thread';
import type { ThreadMessage } from '../../../components/Thread';
import type { Robot } from '../../../data/robots';
import { RobotCard } from '../RobotCard';

interface GroupScreenProps {
  active: boolean;
  robots: Robot[];
  messages: ThreadMessage[];
  onSend: (text: string) => void;
}

export function GroupScreen({ active, robots, messages, onSend }: GroupScreenProps) {
  return (
    <section className="screen chatlike" hidden={!active} aria-label="로봇 단톡방">
      <div className="strip">
        {robots.map(r => <RobotCard key={r.id} robot={r} />)}
      </div>
      <Thread messages={messages} visible={active} />
      <Composer placeholder="@E5 작은방 정리 부탁해" label="단톡방 메시지" onSend={onSend} />
    </section>
  );
}
