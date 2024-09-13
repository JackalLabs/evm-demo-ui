'use client'

import {useAccount, useConnect, useDisconnect, useWriteContract, BaseError, useEnsAddress, useReadContract} from 'wagmi'
import {useEffect, useState} from "react";
import {IMerkletreeSource, Merkletree} from "@jackallabs/dogwood-tree";
import { useEnsName } from 'wagmi'
import {mainnet, sepolia} from 'wagmi/chains'
import { useEnsAvatar } from 'wagmi'
import { normalize } from 'viem/ens'
import { readContract } from '@wagmi/core'

import './page.css'
import {getConfig} from "@/wagmi";

function App() {
    const {connectors, connect} = useConnect()
    const {disconnect} = useDisconnect()
    const {
        data: hash,
        error,
        isPending,
        writeContract
    } = useWriteContract()
    const account = useAccount();


    const {data: ensName } = useEnsName({
        address: account.address,
        // enabled: !!account.address,  // Ensure the query runs only if the address is defined
        chainId: mainnet.id,
    });

    let en = ensName;
    if (en == undefined) {
        en = "";
    }

    const {data: avatar} = useEnsAvatar({
        name: normalize(en),
        // enabled: !!account.address,  // Ensure the query runs only if the address is defined
        chainId: mainnet.id,
    })

    const [file, setFile] = useState<File>(new File([""], ""));
    const [cid, setCid] = useState("");

    const handleFileChange = (event: any) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };


    const abi = [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "_jackalAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "cabinet",
            "inputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "fileAddress",
            "inputs": [
                {
                    "name": "_addr",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_index",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "fileCount",
            "inputs": [
                {
                    "name": "_addr",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "upload",
            "inputs": [
                {
                    "name": "merkle",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "filesize",
                    "type": "uint64",
                    "internalType": "uint64"
                }
            ],
            "outputs": [],
            "stateMutability": "payable"
        }
    ]


    async function doUpload (callback: Function)  {

        setCid("")

        const seed = await file.arrayBuffer()
        const source: IMerkletreeSource = {seed: seed, chunkSize: 10240, preserve: false}
        const tree = await Merkletree.grow(source)
        const root = tree.getRootAsHex()

        console.log(`Root: ${root}`)

        // Replace with your Tendermint WebSocket endpoint
        const wsUrl = 'wss://testnet-rpc.jackalprotocol.com/websocket';

        // Create a new WebSocket connection
        const socket = new WebSocket(wsUrl);

        // Connection opened
        socket.addEventListener("open", (event) => {
            console.log('Connected to the WebSocket');

            // Subscribe to a specific event (e.g., new block header)
            const subscriptionMessage = JSON.stringify({
                "jsonrpc": "2.0",
                "method": "subscribe",
                "id": "1",
                "params": {
                    "query": `tm.event='Tx' AND post_file.file='${root}'`
                }
            });

            socket.send(subscriptionMessage);
            setTimeout(() => {
                socket.close()
            }, 60000)


        });

        socket.addEventListener("message", async (event) => {
            const data = JSON.parse(event.data)
            console.log(data)
            console.log(data.result)
            if (Object.keys(data.result).length == 0) {
                callback(root)
                return
            }

            const startS = data.result.events["post_file.start"][0]
            const senderS = data.result.events["post_file.signer"][0]

            const url = 'https://testnet-provider.jackallabs.io/upload';

            // Create a FormData object
            const formData = new FormData();

            // Append the file to the form data
            // Replace this with an actual File object if using in a browser
            formData.append('file', file);
            // Append the sender and merkle fields
            formData.append('sender', senderS);
            formData.append('merkle', root);
            formData.append('start', startS);

            const request = new Request(url, {
                method: "POST",
                body: formData,
            });


            try {
                // Send the POST request using fetch
                const response = await fetch(request);

                // Handle the response
                if (!response.ok) {
                    throw new Error(`Upload failed with status: ${response.status}`);
                }

                const data = await response.json();

                const cid = data["cid"]
                setCid(cid)

            } catch (error) {
                console.error('Upload failed:', error);
            }


            socket.close()
        });

        console.log("finished")


    }

    function shorten(s:string) {
        if (s.length < 20) {
            return s;
        }

        return s.substring(0, 9) + "..." + s.substring(s.length - 9)
    }

    const getEthPrice = async (): Promise<number> => {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            const data = await response.json();
            return data.ethereum.usd;
        } catch (error) {
            console.error('Error fetching ETH price:', error);
            throw error;
        }
    };

    function getStoragePrice(price: number, filesize: number): number {

        const storagePrice = 15;     // Price per TB in USD with 8 decimal places
        const multiplier = 2;
        const months = 200 * 12;     // Duration in months (200 years)

        let fs = filesize;
        if (fs <= 1024 * 1024) {
            fs = 1024 * 1024;        // Minimum size is 1 MB
        }

        // Base Storage Multiplier (BSM): storage price calculation
        const BSM = storagePrice * multiplier * months * fs;

        // Calculate price in equivalent "wei" (for parallel logic, use integer math)
        // 1e18 converts to smallest ETH units
        const priceInWei = (BSM * 1e18) / (price * 1099511627776);

        // If the result is zero (due to rounding or too small), set a minimum value
        if (priceInWei === 0) {
            return 5000;  // Return a minimum value (e.g., 5000 units of currency)
        }

        return priceInWei;
    }



    function uploadFile() {
        doUpload((root: any) => {
            console.log(root)
            getEthPrice().then(price => {
                const p = getStoragePrice(price, file.size);
                const wei =  Math.floor(p * 1.05)
                console.log("price: " + wei)
                writeContract({
                    address: '0xdE39AF082d4BCfaeF8676ecaccaFd4cFDc7B525D',
                    abi,
                    functionName: 'upload',
                    args: [root, BigInt(file.size)],
                    value: BigInt(wei),
                });
            });

        })

    }

    return (
        <>
            <h1>
                Jackal EVM Demo
            </h1>
            <div id={"account"}>

                <div>
                    {account.status === 'connected' && (
                        <div>
                            <h2>Account</h2>
                            <div className={"flex"}>
                                <div id={"ens-container"}>
                                    {avatar && <img src={avatar} alt="ENS Avatar"
                                                    style={{width: 50, height: 50, borderRadius: '50%'}}/>}
                                    <div id={"names"}>
                                        <span>{ensName ? ensName : account.address}</span>
                                        {ensName && <span id={"address"}>{shorten(account.address)}</span>}
                                    </div>

                                </div>
                                <button className={"discon"} type="button" onClick={() => disconnect()}>
                                    Disconnect
                                </button>
                            </div>

                        </div>
                    )}
                </div>


            </div>

            {account.status != 'connected' && (
                <div className={"connectors"}>
                    <h2>Connect</h2>
                    {connectors.map((connector) => (
                        <button
                            key={connector.uid}
                            onClick={() => connect({connector})}
                            type="button"
                        >
                            {connector.name}
                        </button>
                    ))}
                </div>)}

            <div>
                <h2>Upload</h2>
                <form>
                    <input type="file" onChange={handleFileChange}/>
                </form>
                <button id={"uploadButton"} onClick={uploadFile}
                        disabled={account.status != 'connected' || !file}>Upload
                </button>
                {hash && <div>Transaction Hash: {hash}</div>}
                {isPending && <div>TX Pending...</div>}
                {cid.length > 0 &&
                    <div id={"ipfs"}>IPFS CID: <a target={"_blank"} href={"https://ipfs.io/ipfs/" + cid}>{cid}</a>
                    </div>}
                {hash && cid.length == 0 && <div>File uploading...</div>}
                {error && (
                    <div>Error: {(error as BaseError).shortMessage || error.message}</div>
                )}
            </div>

        </>
    )
}

export default App
