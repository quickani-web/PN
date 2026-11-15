export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Vidora",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  pageSize: Number(process.env.PAGE_SIZE || 24),
  // Revshare 20% · Full Video Mode: Female — best for tube → cam traffic
  chaturbateAffiliateUrl:
    process.env.NEXT_PUBLIC_CHATURBATE_AFFILIATE_URL ||
    "https://chaturbate.com/in/?tour=gLDS&campaign=Z1r6D&track=default&signup_notice=1",
} as const;
