"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  BaseError,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import { useState } from "react";
import Image from "next/image";
import { IMerkletreeSource, Merkletree } from "@jackallabs/dogwood-tree";
import { useEnsName } from "wagmi";
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
import { useEnsAvatar } from "wagmi";
import { normalize } from "viem/ens";
import "react-toastify/dist/ReactToastify.css";

import { AppABI, RootABI } from "./abis";

import "./page.css";
import { Address, Chain } from "viem";
import { toast, ToastContainer } from "react-toastify";

type Network = {
  drawer: Address;
  bridge: Address;
  drawerMainnet: Address;
  bridgeMainnet: Address;
  testnet: Chain;
  mainnet: Chain;
  name: string;
  priceFeed: string;
};

const contracts: Record<string, Network> = {
  base: {
    drawer: "0x83f69195100eea97BA9Fd0a4e15a1657Efd9D631",
    bridge: "0x6f348699508B317862348f8d6F41795900E8d14A",
    drawerMainnet: "0x9C3aA7b7F9116a03e7CAEe52512149FBa43730AF",
    bridgeMainnet: "0x60766928613B818053E9922fC655aB9B7126a02E",
    testnet: baseSepolia,
    mainnet: base,
    name: "Base",
    priceFeed: "ethereum",
  },
  eth: {
    drawer: "0xadCAD6Cc46364a6FF0Cb6d5023Af15388C6D17C1",
    bridge: "0x1A829964Dd155D89eBA94CfB6CAcbEC496C1df32",
    drawerMainnet: "0x0000000000000000000000000000000000000000",
    bridgeMainnet: "0x0000000000000000000000000000000000000000",
    testnet: sepolia,
    mainnet: mainnet,
    name: "Ethereum",
    priceFeed: "ethereum",
  },
  op: {
    drawer: "0x7dAB0A27c5aB9D1Fb3D2f91E9f0eee9BD051a448",
    bridge: "0x82a8d3781241Ab5E5ffF8AB3292765C0f9d0431F",
    drawerMainnet: "0x0000000000000000000000000000000000000000",
    bridgeMainnet: "0x0000000000000000000000000000000000000000",
    testnet: optimismSepolia,
    mainnet: optimism,
    name: "OP",
    priceFeed: "ethereum",
  },
  pol: {
    drawer: "0x093BB75ba20F4fe05c31a63ac42B93252C31aE02",
    bridge: "0xc4A028437c4A9e0435771239c31C15fB20eD0274",
    drawerMainnet: "0x0000000000000000000000000000000000000000",
    bridgeMainnet: "0x0000000000000000000000000000000000000000",
    testnet: polygonAmoy,
    mainnet: polygon,
    name: "Polygon",
    priceFeed: "ethereum",
  },
  arb: {
    drawer: "0x7dAB0A27c5aB9D1Fb3D2f91E9f0eee9BD051a448",
    bridge: "0x82a8d3781241Ab5E5ffF8AB3292765C0f9d0431F",
    drawerMainnet: "0x0000000000000000000000000000000000000000",
    bridgeMainnet: "0x0000000000000000000000000000000000000000",
    testnet: arbitrumSepolia,
    mainnet: arbitrum,
    name: "Arbitrum",
    priceFeed: "ethereum",
  },
  son: {
    drawer: "0x7dAB0A27c5aB9D1Fb3D2f91E9f0eee9BD051a448",
    bridge: "0x82a8d3781241Ab5E5ffF8AB3292765C0f9d0431F",
    drawerMainnet: "0x0000000000000000000000000000000000000000",
    bridgeMainnet: "0x0000000000000000000000000000000000000000",
    testnet: soneiumMinato,
    mainnet: soneium,
    name: "Soneium",
    priceFeed: "ethereum",
  },
};

function App() {
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [network, setNetwork] = useState(contracts.eth);

  const { data: hash, error, isPending, writeContract } = useWriteContract();

  const account = useAccount();

  const [toastId, setToastId] = useState<number | string>(0);
  const {
    refetch: refetchProjects,
    data: allowanceRes,
    isFetched: queryComplete,
  } = useReadContract({
    abi: RootABI,
    address:
      account.chainId != network.testnet.id
        ? network.bridgeMainnet
        : network.bridge,
    functionName: "getAllowance",
    args: [
      // select proper drawer
      account.chainId != network.testnet.id
        ? network.drawerMainnet
        : network.drawer,
      // if account is undefined, account address is drawer
      account.address == undefined
        ? account.chainId != network.testnet.id
          ? network.drawerMainnet
          : network.drawer
        : account.address,
    ],
    // @ts-ignore
    chainId:
      account.chainId != network.testnet.id
        ? network.mainnet.id
        : network.testnet.id,
  });

  const { data: ensName } = useEnsName({
    address: account.address,
    // enabled: !!account.address,  // Ensure the query runs only if the address is defined
    // @ts-ignore
    chainId:
      account.chainId != network.testnet.id
        ? network.mainnet.id
        : network.testnet.id,
  });

  let en = ensName;
  if (en == undefined) {
    en = "";
  }

  const { data: avatar } = useEnsAvatar({
    name: normalize(en),
    // enabled: !!account.address,  // Ensure the query runs only if the address is defined
    // @ts-ignore
    chainId:
      account.chainId != network.testnet.id
        ? network.mainnet.id
        : network.testnet.id,
  });

  const [file, setFile] = useState<File>(new File([""], ""));
  const [cid, setCid] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event: any) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  async function doUpload(callback: Function) {
    setUploading(true);
    setCid("");

    const seed = await file.arrayBuffer();
    const source: IMerkletreeSource = {
      seed: seed,
      chunkSize: 10240,
      preserve: false,
    };
    const tree = await Merkletree.grow(source);
    const root = tree.getRootAsHex();

    console.log(`Root: ${root}`);

    const wsUrl =
      account.chainId != network.testnet.id
        ? "wss://rpc.jackalprotocol.com/websocket"
        : "wss://testnet-rpc.jackalprotocol.com/websocket";

    // Create a new WebSocket connection
    const socket = new WebSocket(wsUrl);

    // Connection opened
    socket.addEventListener("open", (event) => {
      console.log("Connected to the WebSocket");

      // Subscribe to a specific event (e.g., new block header)
      const subscriptionMessage = JSON.stringify({
        jsonrpc: "2.0",
        method: "subscribe",
        id: "1",
        params: {
          query: `tm.event='Tx' AND post_file.file='${root}'`,
        },
      });

      socket.send(subscriptionMessage);
      setTimeout(() => {
        socket.close();
      }, 240000);
    });

    socket.addEventListener("message", async (event) => {
      const data = JSON.parse(event.data);
      console.log(data);
      console.log(data.result);
      if (Object.keys(data.result).length == 0) {
        callback(root);
        return;
      }

      toast.done(toastId);
      setToastId(0);
      toast("TX is finalized!", { type: "success" });

      const startS = data.result.events["post_file.start"][0];
      const senderS = data.result.events["post_file.signer"][0];

      const url =
        account.chainId != network.testnet.id
          ? "https://mprov01.jackallabs.io/v2/upload"
          : "https://testnet-provider.jackallabs.io/v2/upload";

      // Create a FormData object
      const formData = new FormData();

      // Append the file to the form data
      // Replace this with an actual File object if using in a browser
      formData.append("file", file);
      // Append the sender and merkle fields
      formData.append("sender", senderS);
      formData.append("merkle", root);
      formData.append("start", startS);

      const request = new Request(url, {
        method: "POST",
        body: formData,
      });

      try {
        // Send the POST request using fetch
        const response = await toast.promise(fetch(request), {
          pending: "Uploading file",
          success: "File uploaded!",
          error: "Upload failed",
        });

        // Handle the response
        if (!response.ok) {
          throw new Error(`Upload failed with status: ${response.status}`);
        }

        const data = await response.json();

        const job = data["job_id"]

        const joburl =
            account.chainId != network.testnet.id
                ? `https://mprov01.jackallabs.io/v2/status/${job}`
                : `https://testnet-provider.jackallabs.io/v2/status/${job}`;

        let complete = false
        while (!complete) {
          const response = await toast.promise(fetch(joburl), {
            pending: "Checking status",
            success: "File uploaded!",
            error: "Upload failed",
          });



          const data = await response.json();
          const progress = data["progress"];
          if (progress == 100) {
            complete = true
            const cid = data["cid"];
            setCid(cid);
          } else {
            await new Promise(r => setTimeout(r, 250));
          }
        }
      } catch (error) {
        console.error("Upload failed:", error);
      }

      socket.close();
    });

    console.log("finished");
  }

  function shorten(s: string) {
    if (s.length < 20) {
      return s;
    }
    return s.substring(0, 9) + "..." + s.substring(s.length - 9);
  }

  const getEthPrice = async (): Promise<number> => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${network.priceFeed}&vs_currencies=usd`
      );
      const data = await response.json();
      return data[network.priceFeed].usd;
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      throw error;
    }
  };

  function getStoragePrice(price: number, filesize: number): number {
    const storagePrice = 15; // Price per TB in USD with 8 decimal places
    const multiplier = 2;
    const months = 200 * 12; // Duration in months (200 years)

    let fs = filesize;
    if (fs <= 1024 * 1024) {
      fs = 1024 * 1024; // Minimum size is 1 MB
    }

    // Base Storage Multiplier (BSM): storage price calculation
    const BSM = storagePrice * multiplier * months * fs;

    // Calculate price in equivalent "wei" (for parallel logic, use integer math)
    // 1e18 converts to smallest ETH units
    const priceInWei = (BSM * 1e18) / (price * 1099511627776);

    // If the result is zero (due to rounding or too small), set a minimum value
    if (priceInWei === 0) {
      return 5000; // Return a minimum value (e.g., 5000 units of currency)
    }

    return priceInWei;
  }

  async function uploadFile() {
    console.log(account.chainId, network.mainnet.id, network.testnet.id);
    if (!allowanceRes) {
      console.log("must make allowance");
      console.log(RootABI);
      await writeContract({
        abi: RootABI,
        address:
          account.chainId != network.testnet.id
            ? network.bridgeMainnet
            : network.bridge,
        functionName: "addAllowance",
        args: [
          account.chainId != network.testnet.id
            ? network.drawerMainnet
            : network.drawer,
        ],
        // @ts-ignore
        chainId:
          account.chainId != network.testnet.id
            ? network.mainnet.id
            : network.testnet.id,
      });
      toast("Allowance created!", { type: "success" });
    } else {
      doUpload((root: any) => {
        getEthPrice().then(async (price) => {
          const p = getStoragePrice(price, file.size);
          const wei = Math.floor(p * 1.05);
          console.log("price: " + wei);
          await writeContract({
            abi: AppABI,
            address:
              account.chainId != network.testnet.id
                ? network.drawerMainnet
                : network.drawer,
            functionName: "upload",
            args: [root, BigInt(file.size)],
            value: BigInt(wei),
            // @ts-ignore
            chainId:
              account.chainId != network.testnet.id
                ? network.mainnet.id
                : network.testnet.id,
          });
          /*
            await writeContract({
                abi: RootABI,
                address: network.bridge,
                functionName: 'buyStorage',
                args: ["jkl1hgw33c888j7d4az50dn3pykljyl89kaau3s96g", BigInt(30), BigInt("1073741824"), "referral code"],
                value: BigInt(wei),
                // @ts-ignore
                chainId: network.testnet.id,
            });
          */
          const tId = toast("Waiting for TX finality.", {
            autoClose: false,
            isLoading: true,
          });
          setToastId(tId);
        });
      });
    }
  }

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNetwork(contracts[e.target.value]);
  };

  return (
    <>
      <ToastContainer />
      <h1>Jackal EVM Demo</h1>
      <div>
        <select onChange={handleSelect}>
          <option value="eth">Ethereum (Testnet Only)</option>
          <option value="base">Base</option>
          <option value="op">Optimism (Testnet Only)</option>
          <option value="pol">Polygon (Testnet Only)</option>
          <option value="arb">Arbitrum (Testnet Only)</option>
          <option value="son">Soneium (Testnet Only)</option>
        </select>
        <div>
          Selected Network: {network.name}{" "}
          {account.chainId != network.testnet.id ? "Mainnet" : "Testnet"}
        </div>
      </div>
      <div id={"account"}>
        <div>
          {account.status === "connected" && (
            <div>
              <h2>Account</h2>
              <div className={"flex"}>
                <div id={"ens-container"}>
                  {avatar && (
                    <Image
                      src={avatar}
                      alt="ENS Avatar"
                      style={{ width: 50, height: 50, borderRadius: "50%" }}
                    />
                  )}
                  <div id={"names"}>
                    <span>{ensName ? ensName : account.address}</span>
                    {ensName && (
                      <span id={"address"}>{shorten(account.address)}</span>
                    )}
                  </div>
                </div>
                <button
                  className={"discon"}
                  type="button"
                  onClick={() => disconnect()}
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {account.status != "connected" && (
        <div className={"connectors"}>
          <h2>Connect</h2>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              type="button"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}

      <div>
        <h2>Upload</h2>
        <form>
          <input type="file" onChange={handleFileChange} />
        </form>
        <button
          id={"switchButton"}
          onClick={() =>
            switchChain({
              // @ts-ignore
              chainId:
                account.chainId == network.testnet.id
                  ? network.mainnet.id
                  : network.testnet.id,
            })
          } // switches to mainnet or testnet depending
          disabled={account.status != "connected" || !file}
        >
          Switch Chains
        </button>
        <button
          id={"uploadButton"}
          onClick={uploadFile}
          disabled={account.status != "connected" || !file}
        >
          {allowanceRes ? "Upload" : "Make Allowance"}
        </button>
        {hash && <div>Transaction Hash: {hash}</div>}
        {isPending && <div>TX Pending...</div>}
        {cid.length > 0 && (
          <div id={"ipfs"}>
            IPFS CID:{" "}
            <a
              target={"_blank"}
              href={"https://ipfs.jackallabs.io/ipfs/" + cid}
            >
              {cid}
            </a>
          </div>
        )}
        {uploading && cid.length == 0 && allowanceRes && (
          <div>File uploading...</div>
        )}
        {error && (
          <div>Error: {(error as BaseError).shortMessage || error.message}</div>
        )}
      </div>
    </>
  );
}

export default App;
