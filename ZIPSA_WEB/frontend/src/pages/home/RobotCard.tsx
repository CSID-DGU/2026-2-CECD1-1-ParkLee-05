import { Pill } from '../../components/Pill';
import { ROBOT_STATUS } from '../../data/robots';
import type { Robot } from '../../data/robots';

/** 로봇 상태 카드. detailed면 위치와 배터리 수치까지 표시한다. */
export function RobotCard({ robot, detailed }: { robot: Robot; detailed?: boolean }) {
  const [tone, label] = ROBOT_STATUS[robot.status];
  return (
    <div className="rb">
      <b>{robot.id} <Pill tone={tone}>{label}</Pill></b>
      <span className="mut">{detailed ? `${robot.task} · ${robot.zone}` : robot.task}</span>
      {detailed && <span className="num sm mut">배터리 {robot.battery}%</span>}
      <div className="bat">
        <i style={{ width: robot.battery + '%', background: robot.battery < 20 ? 'var(--crit)' : 'var(--good)' }} />
      </div>
    </div>
  );
}
