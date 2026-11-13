import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-navy text-white hover:bg-navy-strong active:bg-navy-strong",
  secondary: "border border-line bg-surface text-ink hover:bg-sunken",
  ghost: "text-ink hover:bg-sunken",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
