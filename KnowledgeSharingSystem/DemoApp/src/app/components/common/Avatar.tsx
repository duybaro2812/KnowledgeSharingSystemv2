interface AvatarProps {
  initials: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  imageUrl?: string;
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export function Avatar({ initials, color, size = 'md', imageUrl }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={initials}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-white`}
      />
    );
  }
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white flex-shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
