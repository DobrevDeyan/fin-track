export const LogoIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className="mr-2 w-6 h-6"
    >
      {/* Modern wallet/money icon with gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
      <rect
        width="20"
        height="16"
        x="2"
        y="4"
        rx="3"
        fill="url(#logoGradient)"
        className="dark:opacity-90"
      />
      <rect
        width="12"
        height="8"
        x="6"
        y="8"
        rx="1.5"
        fill="white"
        fillOpacity="0.2"
      />
      <circle
        cx="12"
        cy="12"
        r="2"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M18 10h2M18 14h2"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />
    </svg>
  );
};

export const LightBulbIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      className="w-12 fill-primary"
    >
      <title>Free Icons</title>
      <g
        id="Layer_49"
        data-name="Layer 49"
      >
        <path
          className="cls-1"
          d="M62,109a23.62,23.62,0,0,1-5.73-.76,13.32,13.32,0,0,1-2.07-.71A9.7,9.7,0,0,1,51,105.18a9.6,9.6,0,0,1-1.13-1.6,5.1,5.1,0,0,1-.63-2,4.81,4.81,0,0,1,.13-1.85,5.67,5.67,0,0,1,.8-1.66,4.54,4.54,0,0,1,3.94-1.88c.46,0,.39.26.1.62a10.79,10.79,0,0,1-1.2,1.32,5.51,5.51,0,0,0-1,1.12,2.9,2.9,0,0,0-.51,1.22,2.83,2.83,0,0,0-.05,1.33,4.84,4.84,0,0,0,.64,1.48,5.59,5.59,0,0,0,1.51,1.56,11,11,0,0,0,2,1,16.87,16.87,0,0,0,5.12,1,28.47,28.47,0,0,0,3.33,0,21.14,21.14,0,0,0,5-.8,16.56,16.56,0,0,0,3.48-1.48c.25-.13.47-.28.71-.42.89-.52,1.22-.62,1.62-.47a2.14,2.14,0,0,1,.27.09c.22.11.06.62-.56,1.2a14.07,14.07,0,0,1-3.13,2.2,16,16,0,0,1-1.79.8c-.63.2-1.27.36-1.91.5a27.47,27.47,0,0,1-5.77.52Z"
        />
      </g>
    </svg>
  );
};

