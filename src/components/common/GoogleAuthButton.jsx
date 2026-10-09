function GoogleAuthButton({ onClick, disabled = false, children }) {
  return (
    <button
      className="google-auth-button"
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      <svg className="google-auth-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.24 5.48-4.7 7.18l7.2 5.59c4.2-3.88 6.54-9.58 6.54-17.24Z" />
        <path fill="#FBBC05" d="M10.54 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.98-6.19Z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.79l-7.2-5.59c-2 1.35-4.57 2.13-8.7 2.13-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
      </svg>
      <span>{children}</span>
    </button>
  );
}

export default GoogleAuthButton;
