import { cn } from './utils';

export default function SkeletonBlock({
  className,
  width,
  height,
  borderRadius,
  rounded = 'rounded-xl',
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  rounded?: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
      }}
      className={cn(
        'animate-levitate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),rgba(201,165,90,0.12),var(--bg-elevated))]',
        rounded,
        className
      )}
    />
  );
}
