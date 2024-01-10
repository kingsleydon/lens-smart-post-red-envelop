// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import {HubRestricted} from "lens/HubRestricted.sol";
import {Types} from "lens/Types.sol";
import {IPublicationActionModule} from "lens/IPublicationActionModule.sol";
import {LensModuleMetadata} from "lens/LensModuleMetadata.sol";
import {IHelloWorld} from "./IHelloWorld.sol";

contract HelloWorldOpenAction is
    HubRestricted,
    IPublicationActionModule,
    LensModuleMetadata
{
    struct RedEnvelope {
        string token;
        uint256 amount;
    }
    mapping(uint256 profileId => mapping(uint256 pubId => RedEnvelope))
        internal _redEnvelopes;
    IHelloWorld internal _helloWorld;

    constructor(
        address lensHubProxyContract,
        address helloWorldContract,
        address moduleOwner
    ) HubRestricted(lensHubProxyContract) LensModuleMetadata(moduleOwner) {
        _helloWorld = IHelloWorld(helloWorldContract);
    }

    function supportsInterface(
        bytes4 interfaceID
    ) public pure override returns (bool) {
        return
            interfaceID == type(IPublicationActionModule).interfaceId ||
            super.supportsInterface(interfaceID);
    }

    function initializePublicationAction(
        uint256 profileId,
        uint256 pubId,
        address /* transactionExecutor */,
        bytes calldata data
    ) external override onlyHub returns (bytes memory) {
        (string memory token, uint256 amount) = abi.decode(
            data,
            (string, uint256)
        );
        _redEnvelopes[profileId][pubId] = RedEnvelope(token, amount);
        return data;
    }

    function processPublicationAction(
        Types.ProcessActionParams calldata params
    ) external override onlyHub returns (bytes memory) {
        RedEnvelope storage redEnvelope = _redEnvelopes[
            params.publicationActedProfileId
        ][params.publicationActedId];

        string memory input = abi.decode(params.actionModuleData, (string));

        require(
            keccak256(abi.encodePacked(input)) ==
                keccak256(abi.encodePacked(redEnvelope.token)),
            "Incorrect token"
        );
        require(redEnvelope.amount > 0, "No red envelopes left");

        redEnvelope.amount = 0;

        // Transfer here

        return abi.encodePacked("Red packet claimed");
    }
}
