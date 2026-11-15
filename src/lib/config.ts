export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Vidora",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  pageSize: Number(process.env.PAGE_SIZE || 24),
  chaturbateAffiliateUrl:
    process.env.NEXT_PUBLIC_CHATURBATE_AFFILIATE_URL ||
    "https://chaturbate.com/in/?tour=LQps&campaign=Z1r6D&track=default&tour=quickani",
} as const;
