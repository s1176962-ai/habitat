import { Moon, Sun } from 'lucide-react';
import type { ThemeName } from '../lib/shapeTrail/palettes';
import { useI18n } from '../i18n';

interface Props {
  theme: ThemeName;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  const dark = theme === 'dark';
  const { t } = useI18n();
  const hint = dark ? t('theme.toLight') : t('theme.toDark');
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={hint}
      title={hint}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-all duration-300 hover:-translate-y-0.5"
      style={{ color: 'var(--muted)' }}
    >
      {dark ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
    </button>
  );
}
