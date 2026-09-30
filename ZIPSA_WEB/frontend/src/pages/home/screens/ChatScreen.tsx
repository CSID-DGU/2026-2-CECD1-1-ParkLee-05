import { Chips, Composer } from '../../../components/Composer';
import { Thread } from '../../../components/Thread';
import type { ThreadMessage } from '../../../components/Thread';
import { CHAT_SUGGESTIONS } from '../intents';

interface ChatScreenProps {
  active: boolean;
  messages: ThreadMessage[];
  onSend: (text: string) => void;
  onMic: () => void;
}

export function ChatScreen({ active, messages, onSend, onMic }: ChatScreenProps) {
  return (
    <section className="screen chatlike" hidden={!active} aria-label="대화">
      <Thread messages={messages} visible={active} />
      <Chips items={CHAT_SUGGESTIONS} onPick={onSend} />
      <Composer placeholder="집에게 물어보세요" label="메시지" onSend={onSend} onMic={onMic} />
    </section>
  );
}
