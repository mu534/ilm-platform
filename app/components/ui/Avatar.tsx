import * as RadixAvatar from "@radix-ui/react-avatar";
import { cn } from "../../utils/cn";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
  bordered?: boolean;
}

const sizes: Record<AvatarSize, string> = {
  xs: "w-6  h-6  text-xs",
  sm: "w-8  h-8  text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  src,
  name,
  size = "md",
  className,
  bordered = false,
}: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0",
        "bg-gold-800/50",
        bordered && "ring-2 ring-gold-500/30",
        sizes[size],
        className,
      )}
    >
      {src && (
        <RadixAvatar.Image
          src={src}
          alt={name ?? "Avatar"}
          className="w-full h-full object-cover"
        />
      )}
      <RadixAvatar.Fallback
        className="w-full h-full flex items-center justify-center font-display font-bold text-gold-300"
        delayMs={src ? 300 : 0}
      >
        {getInitials(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}

// Avatar with name label — useful in comment sections and user lists
interface AvatarWithLabelProps extends AvatarProps {
  label?: string;
  sublabel?: string;
}

export function AvatarWithLabel({
  label,
  sublabel,
  ...avatarProps
}: AvatarWithLabelProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar {...avatarProps} />
      {(label ?? sublabel) && (
        <div className="min-w-0">
          {label && (
            <p className="text-sm font-medium text-white truncate">{label}</p>
          )}
          {sublabel && (
            <p className="text-xs text-ink-500 truncate">{sublabel}</p>
          )}
        </div>
      )}
    </div>
  );
}
