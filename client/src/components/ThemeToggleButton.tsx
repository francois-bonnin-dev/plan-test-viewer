export function ThemeToggleButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="theme-toggle" title="Changer de thème" onClick={onClick}>
      🌓
    </button>
  );
}
