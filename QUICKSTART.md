# Quickstart
1. [Deploy bridge contract](https://github.com/JackalLabs/mulberry/blob/main/DEPLOY.md) or [find a bridge](https://github.com/JackalLabs/mulberry/blob/main/config/config.go#L43) from EVM chain -> Jackal

2. Using [Wagmi](https://wagmi.sh/) to connect React to the EVM chain is recommended
```bash
npm install wagmi viem@2.x @tanstack/react-query
```

3. Configure Wagmi [as recommended](https://wagmi.sh/react/getting-started#use-wagmi) or use the [demo config](https://github.com/JackalLabs/evm-demo-ui/blob/main/src/wagmi.ts)

4. Import the hooks [useReadContract](https://wagmi.sh/react/api/hooks/useReadContract) and [useWriteContract](https://wagmi.sh/react/api/hooks/useWriteContract)
```ts
import { useReadContract, useWriteContract } from "wagmi";

const { data, error, isPending, writeContract } = useWriteContract();
```

5. Locate the [ABI](https://docs.soliditylang.org/en/latest/abi-spec.html) for the bridge contract (RootABI [here](https://github.com/JackalLabs/evm-demo-ui/blob/main/src/app/abis.ts))

6. Export the ABI for your storage contract ([Vyper instructions](https://docs.vyperlang.org/en/latest/deploying-contracts.html#deploying-a-contract))
```bash
forge inspect [contract name] abi
```

7. Check if the user already has an allowance set with `useReadContract`
```ts
const {refetch, data, isFetched} = useReadContract({
    abi: [bridge contract abi],
    address: [bridge contract address],
    functionName: 'getAllowance',
    args: [[storage contract address], [user address]], // keep outer brackets 
    chainId: [network id],
})
```

8. If not, set an allowance for the user using `writeContract`
```ts
await writeContract({
    abi: [bridge contract abi],
    address: [bridge contract address],
    functionName: 'addAllowance',
    args: [[storage contract address]], // keep outer brackets 
    chainId: [network id],
})
```

9. After that, you can call any storage contract function

10. Here we call `upload` from the [example contract](https://github.com/JackalLabs/mulberry/blob/main/forge/src/StorageDrawer.sol#L15)
```ts
await writeContract({
    abi: [storage contract abi],
    address: [bridge contract address],
    functionName: 'upload',
    args: [[file content], [file size]], // keep outer brackets 
    value: [user fee to contract],
    chainId: [network id],
})
```

11. Now you can use [typescript](https://gist.github.com/slightlyskepticalpotat/fa40f705eca2e324f03f881485ecd6a0) to interact directly with Jackal