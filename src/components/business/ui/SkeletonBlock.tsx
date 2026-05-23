interface Props {
  className?: string;
  rounded?: string;
  height?: number | string;
  width?: number | string;
  borderRadius?: number;
}

export default function SkeletonBlock({ className = '', rounded = 'rounded-lg', height, width, borderRadius }: Props) {
  const style: React.CSSProperties = {};
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (borderRadius !== undefined) style.borderRadius = `${borderRadius}px`;

  return (
    <div
      className={`animate-pulse bg-[var(--border-default,rgba(255,255,255,0.08))] ${height === undefined && width === undefined ? rounded : ''} ${className}`}
      style={style}
    />
  );
}
