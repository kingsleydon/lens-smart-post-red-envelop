import {ethers} from 'ethers'
import {uiConfig} from './constants'
import {PostCreatedEventFormatted} from './types'

export const fetchInitMessage = (post: PostCreatedEventFormatted) => {
  const actionModules = post.args.postParams.actionModules
  const index = actionModules.indexOf(uiConfig.openActionContractAddress)
  const actionModuleInitData =
    post.args.postParams.actionModulesInitDatas[index]
  const encodedInitData = ethers.utils.defaultAbiCoder.decode(
    ['string', 'uint256'],
    actionModuleInitData
  )

  return ethers.utils.formatEther(encodedInitData[1])
}
