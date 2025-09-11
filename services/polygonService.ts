/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { ethers } from 'ethers';
import { NFTStorage, File as NFTFile } from 'nft.storage';
import { MintingStatus } from '../App';

// --- Configuration ---
// IMPORTANT: You must replace this with your own API key from https://nft.storage/
// 1. Go to https://nft.storage/
// 2. Sign up or log in.
// 3. Go to the API Keys section and create a new key.
// 4. Paste the key here.
const NFT_STORAGE_TOKEN = 'YOUR_NFT_STORAGE_API_KEY'; // REPLACE WITH YOUR KEY

// This is a sample ERC-721 contract deployed on the Polygon Mumbai testnet.
// You can view it on PolygonScan: https://mumbai.polygonscan.com/address/0x43d555F014115A8A45F4C74A764269D4a968536A
const CONTRACT_ADDRESS = '0x43d555F014115A8A45F4C74A764269D4a968536A'; 
const TARGET_NETWORK = {
    chainId: '0x13881', // Hex for 80001 (Polygon Mumbai)
    chainName: 'Polygon Mumbai Testnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
    blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
};

// --- Contract ABI ---
// A minimal ABI for a standard ERC-721 contract with a safeMint function.
const contractABI = [
  "function safeMint(address to, string memory uri) public",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

// --- NFT.Storage Client ---
let nftStorageClient: NFTStorage | null = null;
if (NFT_STORAGE_TOKEN && NFT_STORAGE_TOKEN !== 'YOUR_NFT_STORAGE_API_KEY') {
    nftStorageClient = new NFTStorage({ token: NFT_STORAGE_TOKEN });
}

/**
 * Prompts the user to switch their wallet's network to Polygon Mumbai.
 */
export const switchToPolygonMumbai = async () => {    
    if (!window.ethereum) throw new Error("No crypto wallet found");
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: TARGET_NETWORK.chainId }],
        });
    } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [TARGET_NETWORK],
                });
            } catch (addError) {
                console.error("Failed to add Polygon Mumbai network", addError);
                throw new Error("Failed to add Polygon Mumbai network.");
            }
        } else {
            console.error("Failed to switch network", switchError);
            throw new Error("Failed to switch to Polygon Mumbai network.");
        }
    }
};

/**
 * Mints an NFT on the Polygon blockchain.
 * @param imageFile The image file to be minted.
 * @param metadata The NFT metadata (title, description, properties).
 * @param setMintingStatus A callback to update the UI with the minting progress.
 * @returns A promise that resolves with the transaction receipt.
 */
export const mintNftOnPolygon = async (
    imageFile: File,
    metadata: { title: string; description: string; properties: any[] },
    setMintingStatus: (status: MintingStatus) => void
): Promise<ethers.ContractTransactionReceipt> => {
    if (!window.ethereum) throw new Error("No crypto wallet found");

    if (!nftStorageClient) {
        throw new Error("NFT.Storage API Key is not set. Please add it in services/polygonService.ts");
    }

    // 1. Check network and switch if necessary
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(TARGET_NETWORK.chainId)) {
        setMintingStatus({ step: 'network', message: 'Requesting network switch to Polygon Mumbai...' });
        await switchToPolygonMumbai();
    }
    
    // Re-initialize provider after potential network switch to ensure it's on the correct chain
    const updatedProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await updatedProvider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

    try {
        // 2. Upload image and metadata to IPFS via NFT.Storage
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

        // 3. Call the smart contract's mint function
        setMintingStatus({ step: 'confirming', message: 'Please confirm the transaction in your wallet...' });
        const mintTx = await contract.safeMint(await signer.getAddress(), metadataUrl);
        
        // 4. Wait for the transaction to be mined
        setMintingStatus({ step: 'minting', message: `Minting in progress... waiting for blockchain confirmation. Transaction hash: ${mintTx.hash}` });
        const receipt = await mintTx.wait();
        
        if (!receipt) {
            throw new Error("Transaction failed to confirm.");
        }

        console.log('Transaction successful:', receipt);
        return receipt;

    } catch (error: any) {
        console.error("Minting failed:", error);
        if (error.code === 'ACTION_REJECTED') {
            throw new Error("Transaction rejected in wallet.");
        }
        // Attempt to extract a more specific reason from the error object
        const reason = error.reason || error.data?.message || error.message;
        throw new Error(reason || "An unknown error occurred during minting.");
    }
};
