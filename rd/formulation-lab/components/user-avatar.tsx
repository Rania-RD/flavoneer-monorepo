import { getAvatarIdentity } from "@flavoneer/ui/avatar";
import type React from "react";

interface UserAvatarProps {
  className?: string;
  label?: string;
  name?: string | null;
  seed?: string | null;
  size: number;
  testId?: string;
  title?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  className = "",
  label,
  name,
  seed,
  size,
  testId,
  title,
}) => {
  const identity = getAvatarIdentity(name, seed);
  const avatarClassName = `inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-extrabold leading-none ${className}`;
  const avatarStyle = {
    backgroundColor: identity.backgroundColor,
    color: identity.color,
    fontSize: Math.max(10, Math.round(size * 0.34)),
    height: size,
    width: size,
  };

  if (label) {
    return (
      <span
        aria-label={label}
        className={avatarClassName}
        data-testid={testId}
        role="img"
        style={avatarStyle}
        title={title}
      >
        {identity.initials}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={avatarClassName}
      data-testid={testId}
      style={avatarStyle}
      title={title}
    >
      {identity.initials}
    </span>
  );
};

export default UserAvatar;
