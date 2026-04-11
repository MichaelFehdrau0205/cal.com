"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import SettingsHeader from "./SettingsHeader";

type SettingsHeaderWithBackButtonProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  CTA?: ReactNode;
  ctaClassName?: string;
  borderInShellHeader?: boolean;
  headerClassName?: string;
};

export default function SettingsHeaderWithBackButton(props: SettingsHeaderWithBackButtonProps) {
  const router = useRouter();

  return <SettingsHeader {...props} backButton={true} onBackButtonClick={() => router.back()} />;
}
