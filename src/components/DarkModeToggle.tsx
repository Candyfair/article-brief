interface DarkModeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

// Manual light/dark toggle, available at any time in the header (SPEC.md §2.10). Label
// names the mode a click switches TO, matching the validated mockups ("SOMBRE" in light
// mode, "CLAIR" in dark mode).
export function DarkModeToggle({ isDark, onToggle }: DarkModeToggleProps) {
  return (
    <button
      type="button"
      className="header-control dark-mode-toggle"
      onClick={onToggle}
      aria-pressed={isDark}
    >
      {isDark ? 'Clair' : 'Sombre'}
    </button>
  );
}
