import Image from "next/image";

type BrandLogoVariant = "rectangle" | "square";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
};

const LOGO_PATHS: Record<
  BrandLogoVariant,
  {
    light: string;
    dark: string;
    width: number;
    height: number;
    alt: string;
    defaultClassName: string;
  }
> = {
  rectangle: {
    light: "/brand/logo-rectangle-blk.png",
    dark: "/brand/logo-rectangle-wh.png",
    width: 690,
    height: 130,
    alt: "PERCUSSION CENTER",
    defaultClassName:
      "h-7 w-auto max-w-[10.5rem] sm:h-8 sm:max-w-[12.5rem]",
  },
  square: {
    light: "/brand/logo-square-blk.png",
    dark: "/brand/logo-square-wh.png",
    width: 428,
    height: 296,
    alt: "PERCUSSION CENTER",
    defaultClassName: "h-20 w-auto max-w-[5rem] sm:h-24 sm:max-w-[6rem]",
  },
};

export default function BrandLogo({
  variant = "rectangle",
  className = "",
  priority = false,
}: BrandLogoProps) {
  const config = LOGO_PATHS[variant];
  const imageClassName = className
    ? `${className} object-contain`
    : `${config.defaultClassName} object-contain object-left`;

  return (
    <>
      <Image
        src={config.light}
        alt={config.alt}
        width={config.width}
        height={config.height}
        priority={priority}
        className={`${imageClassName} dark:hidden`}
      />
      <Image
        src={config.dark}
        alt=""
        aria-hidden
        width={config.width}
        height={config.height}
        priority={priority}
        className={`${imageClassName} hidden dark:block`}
      />
    </>
  );
}
