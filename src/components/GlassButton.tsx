import React, { useEffect, useState } from 'react';
import { Glass, type GlassOptics } from '@samasante/liquid-glass';

export type GlassButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'icon'
  | 'navigation'
  | 'pill'
  | 'danger';

export type GlassButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type GlassButtonShape = 'default' | 'pill' | 'circle' | 'square';

interface CommonGlassProps {
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  shape?: GlassButtonShape;
  active?: boolean;
  refractive?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

type ButtonProps = CommonGlassProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonGlassProps> & {
    href?: undefined;
  };

type AnchorProps = CommonGlassProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonGlassProps> & {
    href: string;
    disabled?: boolean;
  };

export type GlassButtonProps = ButtonProps | AnchorProps;

function useCanUseRealRefraction(enabled: boolean): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setAllowed(false);
      return;
    }

    const reducedTransparency = window.matchMedia?.('(prefers-reduced-transparency: reduce)');
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia?.('(pointer: coarse)');

    const evaluate = () => {
      const blocksTransparency = Boolean(reducedTransparency?.matches);
      const blocksMotion = Boolean(reducedMotion?.matches);
      const isMobile = Boolean(coarsePointer?.matches);
      // Keep mobile GPU crisp by limiting live SVG displacement to desktop fine pointers,
      // while mobile still renders full CSS multi-layered liquid glass.
      setAllowed(!blocksTransparency && !blocksMotion && !isMobile);
    };

    evaluate();
    reducedTransparency?.addEventListener?.('change', evaluate);
    reducedMotion?.addEventListener?.('change', evaluate);
    return () => {
      reducedTransparency?.removeEventListener?.('change', evaluate);
      reducedMotion?.removeEventListener?.('change', evaluate);
    };
  }, [enabled]);

  return allowed;
}

const VARIANT_OPTICS: Record<GlassButtonVariant, Partial<GlassOptics>> = {
  primary: {
    mapSize: 128,
    strength: 0.045,
    depth: 0.42,
    curvature: 0.28,
    bend: 0.48,
    bendWidth: 0.18,
    dispersion: 0.34,
    frost: 8,
    saturate: 1.5,
    specular: 1.05,
    sheen: 0.38,
    glow: 0.14,
    brightness: 0,
  },
  secondary: {
    mapSize: 128,
    strength: 0.042,
    depth: 0.38,
    curvature: 0.24,
    bend: 0.42,
    bendWidth: 0.16,
    dispersion: 0.32,
    frost: 10,
    saturate: 1.45,
    specular: 0.95,
    sheen: 0.32,
    glow: 0.1,
    brightness: 0,
  },
  ghost: {
    mapSize: 128,
    strength: 0.032,
    depth: 0.32,
    curvature: 0.18,
    bend: 0.35,
    dispersion: 0.24,
    frost: 8,
    saturate: 1.35,
    specular: 0.75,
    sheen: 0.22,
    glow: 0.06,
    brightness: 0,
  },
  icon: {
    mapSize: 96,
    strength: 0.052,
    depth: 0.48,
    curvature: 0.34,
    bend: 0.52,
    bendWidth: 0.2,
    dispersion: 0.36,
    frost: 10,
    saturate: 1.5,
    specular: 1.05,
    sheen: 0.35,
    glow: 0.12,
    brightness: 0,
  },
  navigation: {
    mapSize: 128,
    strength: 0.038,
    depth: 0.36,
    curvature: 0.22,
    bend: 0.42,
    bendWidth: 0.16,
    dispersion: 0.3,
    frost: 12,
    saturate: 1.45,
    specular: 0.9,
    sheen: 0.28,
    glow: 0.09,
    brightness: 0,
  },
  pill: {
    mapSize: 96,
    strength: 0.038,
    depth: 0.35,
    curvature: 0.22,
    bend: 0.4,
    dispersion: 0.28,
    frost: 9,
    saturate: 1.4,
    specular: 0.88,
    sheen: 0.26,
    glow: 0.08,
    brightness: 0,
  },
  danger: {
    mapSize: 128,
    strength: 0.04,
    depth: 0.38,
    curvature: 0.24,
    bend: 0.4,
    dispersion: 0.28,
    frost: 9,
    saturate: 1.35,
    specular: 0.88,
    sheen: 0.26,
    glow: 0.1,
    brightness: 0,
  },
};

const getRadiusPx = (
  variant: GlassButtonVariant,
  size: GlassButtonSize,
  shape: GlassButtonShape
): number => {
  if (shape === 'circle' || shape === 'pill' || variant === 'pill' || variant === 'navigation') {
    return 999;
  }
  if (size === 'sm') return 10;
  if (size === 'lg') return 14;
  return 12;
};

export const GlassButton = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  GlassButtonProps
>((props, ref) => {
  const {
    variant = 'secondary',
    size,
    shape = variant === 'pill' || variant === 'navigation' ? 'pill' : variant === 'icon' ? 'circle' : 'default',
    active = false,
    refractive = false,
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className = '',
    children,
    ...rest
  } = props;

  const resolvedSize: GlassButtonSize = size ?? (variant === 'icon' ? 'icon' : 'md');
  const useRealGlass = useCanUseRealRefraction(refractive && !active);
  const radiusPx = getRadiusPx(variant, resolvedSize, shape);

  const classes = [
    'lg-btn',
    `lg-btn--${variant}`,
    `lg-btn--size-${resolvedSize}`,
    `lg-btn--shape-${shape}`,
    active ? 'is-active' : '',
    useRealGlass ? 'has-refraction' : '',
    fullWidth ? 'w-full' : '',
    loading ? 'is-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const innerContent = (
    <>
      {useRealGlass && (
        <Glass
          aria-hidden="true"
          radius={radiusPx}
          optics={VARIANT_OPTICS[variant]}
          className="lg-btn__refraction"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            borderRadius: 'inherit',
            background: 'rgba(255, 255, 255, 0.01)',
          }}
        />
      )}
      <span className="lg-btn__content">
        {leftIcon && <span className="lg-btn__icon">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="lg-btn__icon">{rightIcon}</span>}
      </span>
    </>
  );

  if (typeof props.href === 'string') {
    const { href, disabled, ...anchorRest } = rest as Omit<
      AnchorProps,
      keyof CommonGlassProps
    >;
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : anchorRest.tabIndex}
        className={`${classes} no-underline`}
        {...anchorRest}
      >
        {innerContent}
      </a>
    );
  }

  const { type = 'button', disabled, ...buttonRest } = rest as Omit<
    ButtonProps,
    keyof CommonGlassProps
  >;

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      disabled={disabled || loading}
      className={classes}
      {...buttonRest}
    >
      {innerContent}
    </button>
  );
});

GlassButton.displayName = 'GlassButton';

interface GlassNavbarShellProps {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export const GlassNavbarShell: React.FC<GlassNavbarShellProps> = ({
  children,
  className = '',
  ariaLabel,
}) => {
  const useRealGlass = useCanUseRealRefraction(true);

  return (
    <nav
      className={`nav-pill ${useRealGlass ? 'has-refraction' : ''} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {useRealGlass && (
        <Glass
          aria-hidden="true"
          radius={999}
          optics={{
            mapSize: 128,
            strength: 0.036,
            depth: 0.34,
            curvature: 0.2,
            bend: 0.42,
            bendWidth: 0.16,
            dispersion: 0.28,
            frost: 14,
            saturate: 1.5,
            specular: 0.92,
            sheen: 0.28,
            glow: 0.08,
            brightness: 0,
          }}
          className="lg-btn__refraction"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            borderRadius: 'inherit',
            background: 'rgba(10, 14, 22, 0.28)',
          }}
        />
      )}
      {children}
    </nav>
  );
};
