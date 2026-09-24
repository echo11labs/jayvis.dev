import { Mark, markFromIcon } from '@/lib/ui/marks';
import type { IconName } from '@/lib/ui/icons';

interface CodiconProps {
  name: IconName;
  title?: string;
  className?: string;
  spin?: boolean;
}

export function Codicon({ name, title, className, spin }: CodiconProps) {
  return <Mark name={markFromIcon(name)} title={title} className={className} spin={spin} />;
}
