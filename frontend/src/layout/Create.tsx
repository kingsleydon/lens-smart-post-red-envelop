import {useState} from 'react'
import {useLensHelloWorld} from '../context/LensHelloWorldContext'
import {
  encodeAbiParameters,
  encodeFunctionData,
  parseEther,
  zeroAddress,
} from 'viem'
import {uiConfig} from '../utils/constants'
import {lensHubAbi} from '../utils/lensHubAbi'
import {useWalletClient} from 'wagmi'
import {publicClient} from '../main'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'

export const Create = () => {
  const {address, profileId, refresh} = useLensHelloWorld()
  const {data: walletClient} = useWalletClient()
  const [createState, setCreateState] = useState<string | undefined>()
  const [freeCollect, setFreeCollect] = useState<boolean>(false)
  const [txHash, setTxHash] = useState<string | undefined>()
  const [token, setToken] = useState<string | undefined>()
  const [amount, setAmount] = useState<string | undefined>()
  const uri =
    'ipfs://bafkreidpcqfqj5lhzje7q22pd3njksavrknfdsnqdqfiwjwwspphuyuqbq'

  const createPost = async () => {
    if (!token || !amount) return
    console.log(parseEther(amount))
    const encodedInitData = encodeAbiParameters(
      [{type: 'string'}, {type: 'uint256'}],
      [token, parseEther(amount)]
    )

    const actionModulesInitDatas = [encodedInitData]
    const actionModules = [uiConfig.openActionContractAddress]
    if (freeCollect) {
      const baseFeeCollectModuleTypes = [
        {type: 'uint160'},
        {type: 'uint96'},
        {type: 'address'},
        {type: 'uint16'},
        {type: 'bool'},
        {type: 'uint72'},
        {type: 'address'},
      ]

      const encodedBaseFeeCollectModuleInitData = encodeAbiParameters(
        baseFeeCollectModuleTypes,
        [0, 0, zeroAddress, 0, false, 0, zeroAddress]
      )

      const encodedCollectActionInitData = encodeAbiParameters(
        [{type: 'address'}, {type: 'bytes'}],
        [
          uiConfig.simpleCollectModuleContractAddress,
          encodedBaseFeeCollectModuleInitData,
        ]
      )
      actionModulesInitDatas.push(encodedCollectActionInitData)
      actionModules.push(uiConfig.collectActionContractAddress)
    }

    // Post parameters
    const args = {
      profileId: BigInt(profileId!),
      contentURI: uri,
      actionModules,
      actionModulesInitDatas,
      referenceModule:
        '0x0000000000000000000000000000000000000000' as `0x${string}`,
      referenceModuleInitData: '0x01' as `0x${string}`,
    }

    const calldata = encodeFunctionData({
      abi: lensHubAbi,
      functionName: 'post',
      args: [args],
    })

    setCreateState('PENDING IN WALLET')
    try {
      const hash = await walletClient!.sendTransaction({
        to: uiConfig.lensHubProxyAddress,
        account: address,
        data: calldata,
      })
      setCreateState('PENDING IN MEMPOOL')
      setTxHash(hash)
      const result = await publicClient({
        chainId: 80001,
      }).waitForTransactionReceipt({hash})
      if (result.status === 'success') {
        setCreateState('SUCCESS')
        refresh()
      } else {
        setCreateState('CREATE TXN REVERTED')
      }
    } catch (e) {
      setCreateState(`ERROR: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <>
      <div className="pb-4 w-[400px]">
        {address && profileId && (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col">
              <img
                className="mx-auto rounded-2xl"
                src="https://ipfs.io/ipfs/bafkreidpcqfqj5lhzje7q22pd3njksavrknfdsnqdqfiwjwwspphuyuqbq"
              />
              <p className="my-2">Amount</p>
              <Input
                type="number"
                value={amount}
                min={0}
                onChange={(e) => {
                  const value = e.target.value
                  if (!value.includes('e')) {
                    setAmount(value)
                  }
                }}
              />

              <p className="my-2">Token</p>
              <Input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />

              <div className="my-3 mx-auto">
                <input
                  type="checkbox"
                  id="filterCheckbox"
                  className="mr-3 cursor-pointer"
                  checked={freeCollect}
                  onChange={(e) => setFreeCollect(e.target.checked)}
                />
                <label htmlFor="filterCheckbox">Enable free collects</label>
              </div>
              <Button
                className="mt-3"
                onClick={createPost}
                disabled={!token || !amount}
              >
                Create
              </Button>
            </div>
            {createState && <p className="create-state-text">{createState}</p>}
            {txHash && (
              <a
                href={`${uiConfig.blockExplorerLink}${txHash}`}
                className="block-explorer-link"
                target="_blank"
              >
                Block Explorer Link
              </a>
            )}
            <Button
              variant={'outline'}
              className="my-3"
              onClick={() => {
                setTxHash(undefined)
                setCreateState(undefined)
                setToken('')
                setAmount('')
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
