/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { ethers } from 'ethers';
import { NFTStorage, File as NFTFile } from 'nft.storage';
import { MintingStatus } from '../App';

// --- Configuration ---
// The NFT.Storage API key is retrieved from an environment variable for security.
const NFT_STORAGE_TOKEN = process.env.NFT_STORAGE_TOKEN;

const NETWORKS = {
    'polygon-mainnet': {
        chainId: '0x89', // Hex for 137 (Polygon Mainnet)
        chainName: 'Polygon Mainnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com/'],
        blockExplorerUrls: ['https://polygonscan.com/'],
    },
    'polygon-mumbai': {
        chainId: '0x13881', // Hex for 80001 (Mumbai)
        chainName: 'Polygon Mumbai Testnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
        blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
    }
};

type NetworkName = keyof typeof NETWORKS;

// --- Contract ABI ---
// A minimal ABI for a standard ERC-721 contract with a safeMint function.
const contractABI = [
  "function safeMint(address to, string memory uri) public",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

// --- NFT.Storage Client ---
// Initialize the client only if the token is provided.
const nftStorageClient = NFT_STORAGE_TOKEN ? new NFTStorage({ token: NFT_STORAGE_TOKEN }) : null;

/**
 * Prompts the user to switch their wallet's network.
 * @param networkName The key of the network to switch to (e.g., 'polygon-mainnet').
 */
export const switchToNetwork = async (networkName: NetworkName) => {    
    if (!window.ethereum) throw new Error("No crypto wallet found");
    const targetNetwork = NETWORKS[networkName];
    if (!targetNetwork) throw new Error(`Invalid network name: ${networkName}`);

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetNetwork.chainId }],
        });
    } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [targetNetwork],
                });
            } catch (addError) {
                console.error(`Failed to add ${targetNetwork.chainName} network`, addError);
                throw new Error(`Failed to add ${targetNetwork.chainName} network.`);
            }
        } else {
            console.error("Failed to switch network", switchError);
            throw new Error(`Failed to switch to ${targetNetwork.chainName} network.`);
        }
    }
};

/**
 * Mints an NFT from a pre-uploaded metadata URL.
 * This is the core minting function used for batch minting.
 */
export const mintFromMetadataUrl = async (options: {
    contractAddress: string,
    networkName: NetworkName,
    toAddress: string,
    metadataUrl: string
}): Promise<ethers.ContractTransactionReceipt | null> => {
    const { contractAddress, networkName, toAddress, metadataUrl } = options;

    if (!window.ethereum) throw new Error("No crypto wallet found");
    if (!ethers.isAddress(contractAddress)) throw new Error("Invalid contract address.");

    // 1. Check network and switch if necessary
    await switchToNetwork(networkName);
    
    // 2. Setup ethers and contract
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    try {
        // 3. Call the smart contract's mint function
        const mintTx = await contract.safeMint(toAddress, metadataUrl);
        
        // 4. Wait for the transaction to be mined
        const receipt = await mintTx.wait();
        
        if (!receipt) {
            throw new Error("Transaction failed to confirm.");
        }

        console.log('Transaction successful:', receipt);
        return receipt;
    } catch (error: any) {
        console.error("Minting from metadata URL failed:", error);
        if (error.code === 'ACTION_REJECTED') {
            throw new Error("Transaction rejected in wallet.");
        }
        const reason = error.reason || error.data?.message || error.message;
        throw new Error(reason || "An unknown error occurred during minting.");
    }
}


/**
 * Mints a single NFT, including uploading assets to IPFS.
 * Used for the main editor-to-mint flow.
 * @param imageFile The image file to be minted.
 * @param metadata The NFT metadata (title, description, properties).
 * @param setMintingStatus A callback to update the UI with the minting progress.
 * @param config The contract address and network name.
 * @returns A promise that resolves with the transaction receipt.
 */
export const mintNftOnPolygon = async (
    imageFile: File,
    metadata: { title: string; description: string; properties: any[] },
    setMintingStatus: (status: MintingStatus) => void,
    config: { contractAddress: string; networkName: NetworkName }
): Promise<ethers.ContractTransactionReceipt | null> => {
    if (!window.ethereum) throw new Error("No crypto wallet found");
    if (!nftStorageClient) {
        throw new Error("NFT.Storage API Key is not configured. Minting is disabled.");
    }
    if (!ethers.isAddress(config.contractAddress)) {
        throw new Error("Invalid Contract Address provided. Please configure it in the Minter tab.");
    }

    setMintingStatus({ step: 'network', message: `Requesting network switch to ${NETWORKS[config.networkName].chainName}...` });
    await switchToNetwork(config.networkName);
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    try {
        setMintingStatus({ step: 'uploading', message: 'Uploading asset to decentralized storage (IPFS)...' });
        const imageForNFT = new NFTFile([imageFile], imageFile.name, { type: imageFile.type });
        
        const storedMetadata = await nftStorageClient.store({
            name: metadata.title,
            description: metadata.description,
            image: imageForNFT,
            attributes: metadata.properties,
        });

        const metadataUrl = storedMetadata.url;
        console.log('Metadata stored at:', metadataUrl);

        setMintingStatus({ step: 'confirming', message: 'Please confirm the transaction in your wallet...' });
        
        const receipt = await mintFromMetadataUrl({
            contractAddress: config.contractAddress,
            networkName: config.networkName,
            toAddress: await signer.getAddress(),
            metadataUrl: metadataUrl
        });

        setMintingStatus({ step: 'minting', message: `Minting in progress... waiting for blockchain confirmation. Transaction hash: ${receipt?.hash}` });

        return receipt;

    } catch (error: any) {
        console.error("Minting failed:", error);
        // mintFromMetadataUrl already formats the error, so we can just re-throw it.
        throw error;
    }
};