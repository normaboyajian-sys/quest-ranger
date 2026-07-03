// CDN-hosted Coinbase font & icon asset URLs.
// Fonts live at Lovable CDN; SVGs are imported from src/assets/cb/.

import cbDisplayPtr from "@/assets/cb/cb-display.woff2.asset.json";
import cbFont2Ptr from "@/assets/cb/cb-font-2.woff2.asset.json";
import cbFont3Ptr from "@/assets/cb/cb-font-3.woff2.asset.json";
import cbFont4Ptr from "@/assets/cb/cb-font-4.woff2.asset.json";
import cbSansRegPtr from "@/assets/cb/Coinbase_Sans-Regular.woff2.asset.json";
import cbSansMedPtr from "@/assets/cb/Coinbase_Sans-Medium.woff2.asset.json";
import cbSansBoldPtr from "@/assets/cb/Coinbase_Sans-Bold.woff2.asset.json";
import cbMonoBoldPtr from "@/assets/cb/Coinbase_Mono-Bold-web.woff2.asset.json";
import cbMonoMedPtr from "@/assets/cb/Coinbase_Mono-Medium-web.woff2.asset.json";
import cbMonoRegPtr from "@/assets/cb/Coinbase_Mono-Regular-web.woff2.asset.json";
import cbMonoLightPtr from "@/assets/cb/Coinbase_Mono-Light-web.woff2.asset.json";
import cbMonoXLightPtr from "@/assets/cb/Coinbase_Mono-Extra_Light-web-2.woff2.asset.json";
import cbTextBoldPtr from "@/assets/cb/Coinbase_Text-Bold-web-1.32.woff2.asset.json";
import cbTextBoldItPtr from "@/assets/cb/Coinbase_Text-Bold_Italic-web-1.32.woff2.asset.json";

import cbShieldUrl from "@/assets/cb/cb-shield.svg";
import ledgerLogoUrl from "@/assets/cb/ledger-logo-white.svg";
import trezorLogoUrl from "@/assets/cb/trezor-logo-white.svg";
import usdcRewardsUrl from "@/assets/cb/usdc-rewards.svg";

export const cbFonts = {
  display: cbDisplayPtr.url,
  font2: cbFont2Ptr.url,
  font3: cbFont3Ptr.url,
  font4: cbFont4Ptr.url,
  sansRegular: cbSansRegPtr.url,
  sansMedium: cbSansMedPtr.url,
  sansBold: cbSansBoldPtr.url,
  monoBold: cbMonoBoldPtr.url,
  monoMedium: cbMonoMedPtr.url,
  monoRegular: cbMonoRegPtr.url,
  monoLight: cbMonoLightPtr.url,
  monoExtraLight: cbMonoXLightPtr.url,
  textBold: cbTextBoldPtr.url,
  textBoldItalic: cbTextBoldItPtr.url,
};

export const cbIcons = {
  shield: cbShieldUrl,
  ledger: ledgerLogoUrl,
  trezor: trezorLogoUrl,
  usdcRewards: usdcRewardsUrl,
};
