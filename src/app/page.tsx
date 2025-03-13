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
  testnet: Chain;
  mainnet: Chain;
  name: string;
  priceFeed: string;
};

const contracts: Record<string, Network> = {
  base: {
    drawer: "0x82a8d3781241Ab5E5ffF8AB3292765C0f9d0431F",
    bridge: "0x5d26f092717A538B446A301C2121D6C68157467C",
    testnet: baseSepolia,
    mainnet: base,
    name: "Base",
    priceFeed: "ethereum",
  },
  eth: {
    drawer: "0xB51DC38E8d6EDB08D20B145631F94Ac9d91455d0",
    bridge: "0x093BB75ba20F4fe05c31a63ac42B93252C31aE02",
    testnet: sepolia,
    mainnet: mainnet,
    name: "Ethereum",
    priceFeed: "ethereum",
  },
  op: {
    drawer: "0x5d26f092717A538B446A301C2121D6C68157467C",
    bridge: "0xA3FF0a3e8edCd1c1BefBa6e48e847DB9feF82CA2",
    testnet: optimismSepolia,
    mainnet: optimism,
    name: "OP",
    priceFeed: "ethereum",
  },
  pol: {
    drawer: "0x7dAB0A27c5aB9D1Fb3D2f91E9f0eee9BD051a448",
    bridge: "0x5d26f092717A538B446A301C2121D6C68157467C",
    testnet: polygonAmoy,
    mainnet: polygon,
    name: "Polygon",
    priceFeed: "ethereum",
  },
  arb: {
    drawer: "0x5d26f092717A538B446A301C2121D6C68157467C",
    bridge: "0xA3FF0a3e8edCd1c1BefBa6e48e847DB9feF82CA2",
    testnet: arbitrumSepolia,
    mainnet: arbitrum,
    name: "Arbitrum",
    priceFeed: "ethereum",
  },
  son: {
    drawer: "0x5d26f092717A538B446A301C2121D6C68157467C",
    bridge: "0xA3FF0a3e8edCd1c1BefBa6e48e847DB9feF82CA2",
    testnet: soneiumMinato,
    mainnet: soneium,
    name: "Soneium",
    priceFeed: "ethereum",
  },
};

function App() {
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { chains, switchChain } = useSwitchChain();
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
    address: network.bridge,
    functionName: "getAllowance",
    args: [
      network.drawer,
      account.address == undefined ? network.drawer : account.address,
    ],
    // @ts-ignore
    chainId: network.testnet.id,
  });

  const { data: ensName } = useEnsName({
    address: account.address,
    // enabled: !!account.address,  // Ensure the query runs only if the address is defined
    // @ts-ignore
    chainId: network.mainnet.id,
  });

  let en = ensName;
  if (en == undefined) {
    en = "";
  }

  const { data: avatar } = useEnsAvatar({
    name: normalize(en),
    // enabled: !!account.address,  // Ensure the query runs only if the address is defined
    // @ts-ignore
    chainId: network.mainnet.id,
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

    // Replace with your Tendermint WebSocket endpoint
    const wsUrl = "wss://testnet-rpc.jackalprotocol.com/websocket";

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

      const url = "https://testnet-provider.jackallabs.io/upload";

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

        const cid = data["cid"];
        setCid(cid);
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
    console.log(account.chainId, network.testnet.id);
    if (account.chainId != network.testnet.id) {
      // @ts-ignore
      switchChain({ chainId: network.testnet.id });
    } else if (!allowanceRes) {
      console.log("must make allowance");
      console.log(RootABI);
      await writeContract({
        abi: RootABI,
        address: network.bridge,
        functionName: "addAllowance",
        args: [network.drawer],
        // @ts-ignore
        chainId: network.testnet.id,
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
            address: network.drawer,
            functionName: "upload",
            args: [root, BigInt(file.size)],
            value: BigInt(wei),
            // @ts-ignore
            chainId: network.testnet.id,
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
                        await writeContract({
                            abi: RootABI,
                            address: network.bridge,
                            functionName: 'postKey',
                            args: ["test key"],
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
          <option value="eth">Ethereum</option>
          <option value="base">Base</option>
          <option value="op">OP</option>
          <option value="pol">Polygon</option>
          <option value="arb">Arbitrum</option>
          <option value="son">Soneium</option>
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
          id={"uploadButton"}
          onClick={uploadFile}
          disabled={account.status != "connected" || !file}
        >
          {account.chainId != network.testnet.id
            ? "Switch Chains"
            : allowanceRes
              ? "Upload"
              : "Make Allowance"}
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
