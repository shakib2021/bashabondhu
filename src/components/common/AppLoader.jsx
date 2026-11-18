export default function AppLoader({
  label = 'Loading...',
  compact = false,
  className = '',
}) {
  return (
    <div
      className={`app-loader${compact ? ' app-loader-compact' : ''}${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
    >
      <img className="app-loader-image" src="/loader.png" alt="" aria-hidden="true" />
      {label && <span className="app-loader-label">{label}</span>}
    </div>
  );
}
