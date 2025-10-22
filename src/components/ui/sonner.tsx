"use client";

// Temporarily disabled problematic imports to fix webpack errors
// import { useTheme } from "next-themes@0.4.6";
// import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

interface ToasterProps {
  position?: string;
  toastOptions?: any;
}

const Toaster = ({ ...props }: ToasterProps) => {
  // Temporary placeholder - returns null to avoid errors
  return null;
};

export { Toaster };
