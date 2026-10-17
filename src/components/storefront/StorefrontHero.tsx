import Link from "next/link";
import { Avatar } from "@/components/Brand";
import {
  YoutubeIcon,
  InstagramIcon,
  TwitterXIcon,
  LinkedinIcon,
  TelegramIcon,
  WhatsappIcon,
  WebsiteIcon,
  GithubIcon,
  SubstackIcon,
  CheckCircleIcon,
} from "./icons";
import type { StorefrontConfig } from "@/lib/storefront";

interface StorefrontHeroProps {
  creator: {
    displayName: string;
    handle: string;
    bio: string;
    brandColor: string;
    productsCount: number;
    channelsCount: number;
  };
  config: StorefrontConfig;
}

export function StorefrontHero({ creator, config }: StorefrontHeroProps) {
  const socials = config.socialLinks || {};
  const hasSocials = Object.values(socials).some((v) => !!v);

  return (
    <div className="relative border-b border-line/80 bg-surface">
      {/* Cover Banner */}
      <div className="relative h-44 w-full overflow-hidden bg-brand-soft/80 sm:h-56 lg:h-64">
        {config.coverUrl ? (
          <img
            src={config.coverUrl}
            alt={`${creator.displayName} cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="relative h-full w-full bg-linear-to-r from-brand-soft via-surface to-brand-soft/40">
            <div className="absolute inset-0 bg-grid opacity-60" />
            <div className="absolute inset-0 bg-radial from-transparent to-surface/80" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-surface via-transparent to-transparent" />
      </div>

      {/* Profile Header Content */}
      <div className="relative mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="-mt-16 flex flex-col gap-6 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
          {/* Avatar & Main Info */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative inline-block shrink-0">
              {config.avatarUrl ? (
                <div className="h-28 w-28 overflow-hidden rounded-2xl border-4 border-surface shadow-md sm:h-32 sm:w-32">
                  <img
                    src={config.avatarUrl}
                    alt={creator.displayName}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border-4 border-surface shadow-md">
                  <Avatar name={creator.displayName} size={112} />
                </div>
              )}
              {config.verifiedBadge && (
                <div
                  title={config.verifiedBadge}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-brand-ink ring-2 ring-surface shadow-xs"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl text-ink">
                  {creator.displayName}
                </h1>
                {config.verifiedBadge && (
                  <span className="badge badge-brand text-[11px] font-bold">
                    {config.verifiedBadge}
                  </span>
                )}
                {config.statusBadge && (
                  <span className="badge badge-good text-[11px] font-semibold">
                    {config.statusBadge}
                  </span>
                )}
              </div>

              {config.headline && (
                <p className="text-sm font-medium text-ink/80 sm:text-base">
                  {config.headline}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                {config.location && <span>📍 {config.location}</span>}
                <span>
                  {creator.productsCount} {creator.productsCount === 1 ? "product" : "products"}
                </span>
                <span className="font-mono text-muted/80">@{creator.handle}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0">
            {creator.channelsCount > 0 && (
              <Link
                href={`/c/${creator.handle}/community`}
                className="btn btn-secondary btn-sm"
              >
                Customer community
              </Link>
            )}
            <a
              href="#products"
              className="btn btn-primary btn-sm"
            >
              Explore products ↓
            </a>
          </div>
        </div>

        {/* Bio Text */}
        {creator.bio && (
          <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted sm:text-base">
            {creator.bio}
          </p>
        )}

        {/* Social Links Bar */}
        {hasSocials && (
          <div className="mt-5 flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted mr-1">
              Connect:
            </span>
            {socials.youtube && (
              <a
                href={socials.youtube}
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink active:scale-95"
              >
                <YoutubeIcon className="h-4 w-4" />
              </a>
            )}
            {socials.instagram && (
              <a
                href={socials.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink active:scale-95"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
            )}
            {socials.twitter && (
              <a
                href={socials.twitter}
                target="_blank"
                rel="noreferrer"
                aria-label="X / Twitter"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink active:scale-95"
              >
                <TwitterXIcon className="h-3.5 w-3.5" />
              </a>
            )}
            {socials.linkedin && (
              <a
                href={socials.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink active:scale-95"
              >
                <LinkedinIcon className="h-3.5 w-3.5" />
              </a>
            )}
            {socials.telegram && (
              <a
                href={socials.telegram}
                target="_blank"
                rel="noreferrer"
                aria-label="Telegram"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink active:scale-95"
              >
                <TelegramIcon className="h-4 w-4" />
              </a>
            )}
            {socials.whatsapp && (
              <a
                href={socials.whatsapp}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink active:scale-95"
              >
                <WhatsappIcon className="h-4 w-4" />
              </a>
            )}
            {socials.website && (
              <a
                href={socials.website}
                target="_blank"
                rel="noreferrer"
                aria-label="Website"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink active:scale-95"
              >
                <WebsiteIcon className="h-4 w-4" />
              </a>
            )}
            {socials.substack && (
              <a
                href={socials.substack}
                target="_blank"
                rel="noreferrer"
                aria-label="Substack"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink active:scale-95"
              >
                <SubstackIcon className="h-4 w-4" />
              </a>
            )}
            {socials.github && (
              <a
                href={socials.github}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink active:scale-95"
              >
                <GithubIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
