import { coverHue, initials, mediaUrl } from '../lib/format';

export function Cover({
  title,
  imageUrl,
  size = 'md',
}: {
  title: string;
  imageUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const src = mediaUrl(imageUrl);
  if (src) {
    return <img className={`cover cover-${size}`} src={src} alt={`Portada de ${title}`} />;
  }
  return (
    <div
      className={`cover cover-fallback cover-${size}`}
      style={{ background: `hsl(${coverHue(title)} 32% 28%)` }}
      aria-hidden="true"
    >
      <span>{initials(title)}</span>
    </div>
  );
}
