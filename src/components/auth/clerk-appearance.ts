export const authClerkAppearance = {
  elements: {
    rootBox: "w-full",
    card: "!w-full !bg-transparent !p-0 !shadow-none",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "!rounded-[var(--radius-md)] !border !border-[var(--border-subtle)] !bg-[var(--surface-elevated)] !shadow-none hover:!bg-[var(--surface-hover)]",
    socialButtonsBlockButtonText:
      "!text-[0.8125rem] !font-medium !text-[var(--text-primary)]",
    dividerText: "!text-[var(--text-tertiary)]",
    dividerLine: "!bg-[var(--border-subtle)]",
    formFieldLabel:
      "!text-[0.68rem] !font-semibold !uppercase !tracking-[0.08em] !text-[var(--text-tertiary)]",
    formFieldInput:
      "!h-10 !rounded-[var(--radius-md)] !border !border-[var(--border-subtle)] !bg-[var(--surface-elevated)] !text-[var(--text-primary)] placeholder:!text-[var(--text-tertiary)]",
    formButtonPrimary:
      "!h-10 !rounded-[var(--radius-md)] !border-0 !bg-[var(--accent-primary)] !text-[var(--text-inverse)] !shadow-none hover:!opacity-95",
    footerActionText: "!text-[var(--text-tertiary)]",
    footerActionLink: "!text-[var(--accent-primary)] hover:!underline",
    identityPreviewText: "!text-[var(--text-secondary)]",
    formFieldErrorText: "!text-[var(--loss-primary)]",
    formFieldSuccessText: "!text-[var(--profit-primary)]",
    alert:
      "!rounded-[var(--radius-md)] !border !border-[var(--border-subtle)] !bg-[var(--loss-bg)]",
    alertText: "!text-[var(--loss-primary)]",
    formResendCodeLink: "!text-[var(--accent-primary)] hover:!underline",
    otpCodeFieldInput:
      "!h-10 !rounded-[var(--radius-md)] !border !border-[var(--border-subtle)] !bg-[var(--surface-elevated)] !text-[var(--text-primary)]",
    navbarButton: "!text-[var(--text-secondary)] hover:!text-[var(--text-primary)]",
  },
} as const;
