import type { ReactNode, SVGProps } from "react";

// One stroke family for all UI chrome: 24 grid, 1.75 stroke, round caps and joins, currentColor.
// Decorative by default (aria-hidden); pass aria-label (and aria-hidden={false}) when an icon stands alone.
// Brand and gateway marks live in gateway-icons.tsx, not here.

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Rendered width and height in px. */
  size?: number;
};

function make(paths: ReactNode, displayName: string) {
  const Icon = ({ size = 20, ...rest }: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

export const IconCheck = make(<path d="m5 12.5 4.5 4.5L19 7.5" />, "IconCheck");

export const IconX = make(<path d="M6 6l12 12M18 6 6 18" />, "IconX");

export const IconArrowRight = make(<path d="M4.5 12h15M13.5 6l6 6-6 6" />, "IconArrowRight");

export const IconArrowLeft = make(<path d="M19.5 12h-15M10.5 6l-6 6 6 6" />, "IconArrowLeft");

export const IconChevronDown = make(<path d="m6 9.5 6 6 6-6" />, "IconChevronDown");

export const IconPlus = make(<path d="M12 5v14M5 12h14" />, "IconPlus");

export const IconCopy = make(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h8" />
  </>,
  "IconCopy",
);

export const IconLock = make(
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
  "IconLock",
);

export const IconTrash = make(
  <>
    <path d="M4 7h16M9.5 7V4.5h5V7" />
    <path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
    <path d="M10 11v6M14 11v6" />
  </>,
  "IconTrash",
);

export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </>,
  "IconSearch",
);

export const IconExternal = make(
  <>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </>,
  "IconExternal",
);

export const IconDrag = make(
  <>
    <circle cx="9" cy="6" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="18" r="1" />
  </>,
  "IconDrag",
);

export const IconMenu = make(<path d="M4 7h16M4 12h16M4 17h16" />, "IconMenu");

export const IconInfo = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.75v.01" />
  </>,
  "IconInfo",
);

export const IconAlert = make(
  <>
    <path d="M10.3 4.6 2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4.5" />
    <path d="M12 17.25v.01" />
  </>,
  "IconAlert",
);

export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.25 2" />
  </>,
  "IconClock",
);
