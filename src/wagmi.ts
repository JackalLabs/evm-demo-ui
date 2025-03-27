import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  polygon,
  polygonAmoy,
  arbitrum,
  arbitrumSepolia,
  soneium,
  soneiumMinato,
} from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

export function getConfig() {
  return createConfig({
    chains: [
      mainnet,
      sepolia,
      base,
      baseSepolia,
      optimism,
      optimismSepolia,
      polygon,
      polygonAmoy,
      arbitrum,
      arbitrumSepolia,
      soneium,
      soneiumMinato,
    ],
    connectors: [
      injected(),
      coinbaseWallet(),
      // walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [base.id]: http(),
      [baseSepolia.id]: http(),
      [optimismSepolia.id]: http(),
      [optimism.id]: http(),
      [polygonAmoy.id]: http(),
      [polygon.id]: http(),
      [arbitrum.id]: http(),
      [arbitrumSepolia.id]: http(),
      [soneium.id]: http(),
      [soneiumMinato.id]: http(),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}
