export const authClerkAppearance = {
  elements: {
    rootBox: "!w-full !min-w-0 !max-w-none !bg-transparent",
    cardBox:
      "!w-full !min-w-0 !max-w-none !overflow-visible !rounded-none !border-0 !bg-transparent !shadow-none",
    main: "!w-full !min-w-0 !max-w-none !overflow-visible gap-4",
    card:
      "!w-full !min-w-0 !max-w-none !overflow-visible !rounded-none !border-0 !bg-transparent !p-0 !shadow-none",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    footer: "hidden",
    socialButtonsBlockButton:
      "!h-11 !w-full !rounded-[var(--radius-md)] !border !border-[var(--border-subtle)] !bg-[var(--surface-elevated)] !shadow-none hover:!bg-[var(--surface-hover)]",
    socialButtonsBlockButtonText:
      "!text-sm !font-medium !text-[var(--text-primary)]",
    dividerText: "!text-[var(--text-tertiary)]",
    dividerLine: "!bg-[var(--border-subtle)]",
    formFieldLabel:
      "!text-[0.68rem] !font-semibold !uppercase !tracking-[0.08em] !text-[var(--text-tertiary)]",
    formFieldInput:
      "!h-11 !w-full !rounded-[var(--radius-md)] !border !border-[var(--border-subtle)] !bg-[var(--surface-elevated)] !text-sm !text-[var(--text-primary)] placeholder:!text-[var(--text-tertiary)]",
    formFieldInputShowPasswordButton:
      "!text-[var(--text-tertiary)] hover:!text-[var(--text-primary)]",
    formFieldAction: "!text-[var(--accent-primary)] hover:!underline",
    formButtonPrimary:
      "!h-11 !rounded-[var(--radius-md)] !border-0 !bg-[var(--accent-primary)] !text-[var(--text-inverse)] !shadow-none hover:!opacity-95",
    footerActionText: "!text-[var(--text-tertiary)]",
    footerActionLink: "!text-[var(--accent-primary)] hover:!underline",
    identityPreviewText: "!text-[var(--text-secondary)]",
    identityPreviewEditButton:
      "!text-[var(--accent-primary)] hover:!underline",
    formFieldErrorText: "!text-[var(--loss-primary)]",
    formFieldSuccessText: "!text-[var(--profit-primary)]",
    alert:
      "!rounded-[var(--radius-md)] !border !border-[var(--border-subtle)] !bg-[var(--loss-bg)]",
    alertText: "!text-[var(--loss-primary)]",
    formResendCodeLink: "!text-[var(--accent-primary)] hover:!underline",
    otpCodeFieldInput:
      "!h-11 !rounded-[var(--radius-md)] !border !border-[var(--border-subtle)] !bg-[var(--surface-elevated)] !text-[var(--text-primary)]",
    navbarButton: "!text-[var(--text-secondary)] hover:!text-[var(--text-primary)]",
  },
} as const;
