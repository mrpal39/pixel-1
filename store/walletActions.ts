/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { AppDispatch, RootState } from './index';
import { setWalletAddress } from './walletSlice';
import { setNfts } from './nftsSlice';
import { setIsLoading, setError } from './editorSlice';

const WALLET_ADDRESS_STORAGE_KEY = 'pixshop-last-connected-wallet';

// --- Reusable Thunks ---

/**
 * Loads NFTs for a given wallet address from localStorage.
 */
const loadNftsForWallet = (walletAddress: string) => (dispatch: AppDispatch) => {
    try {
        const storedNfts = localStorage.getItem(`nfts-${walletAddress}`);
        if (storedNfts) {
            dispatch(setNfts(JSON.parse(storedNfts)));
        } else {
            dispatch(setNfts([]));
        }
    } catch (error) {
        console.error("Failed to load NFTs from localStorage:", error);
        dispatch(setNfts([])); // Reset on error
    }
};


// --- Exported Thunks for Components ---

/**
 * Handles the entire wallet connection flow.
 */
export const connectWallet = () => async (dispatch: AppDispatch) => {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
                const address = accounts[0];
                localStorage.setItem(WALLET_ADDRESS_STORAGE_KEY, address); // Save address on successful connection
                dispatch(setWalletAddress(address));
                dispatch(loadNftsForWallet(address));
            }
        } catch (error) {
            console.error("Wallet connection failed:", error);
            dispatch(setError("Failed to connect wallet. Please try again."));
        }
    } else {
        dispatch(setError("Please install a Web3 wallet like MetaMask."));
    }
};

/**
 * Handles the wallet disconnection flow.
 */
export const disconnectWallet = () => (dispatch: AppDispatch) => {
    localStorage.removeItem(WALLET_ADDRESS_STORAGE_KEY); // Clear saved address on disconnect
    dispatch(setWalletAddress(null));
    dispatch(setNfts([]));
};

/**
 * Tries to silently connect to a wallet on application startup by checking the
 * wallet provider for a previously authorized connection.
 */
export const silentConnect = () => async (dispatch: AppDispatch) => {
    if (!window.ethereum) {
        dispatch(setIsLoading(false));
        return;
    };
    
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const lastConnectedAddress = localStorage.getItem(WALLET_ADDRESS_STORAGE_KEY);
        
        // Prioritize the account reported by the wallet provider (most secure)
        if (accounts && accounts.length > 0) {
            const address = accounts[0];
            console.log("Wallet silently reconnected via provider:", address);
            // Ensure localStorage is in sync with the provider
            if (address !== lastConnectedAddress) {
                localStorage.setItem(WALLET_ADDRESS_STORAGE_KEY, address);
            }
            dispatch(setWalletAddress(address));
            dispatch(loadNftsForWallet(address));
        } else {
            // If the provider has no accounts, the user is disconnected.
            // Clear any stale address from storage.
            if (lastConnectedAddress) {
                localStorage.removeItem(WALLET_ADDRESS_STORAGE_KEY);
            }
        }
    } catch (err) {
        console.error("Silent wallet connection failed:", err);
    } finally {
        dispatch(setIsLoading(false));
    }
};

/**
 * Handles logic for when the wallet's account is changed by the user.
 */
export const handleAccountsChanged = (accounts: string[]) => (dispatch: AppDispatch, getState: () => RootState) => {
    const { walletAddress } = getState().wallet;

    if (accounts.length > 0) {
        const newAddress = accounts[0];
        if (newAddress !== walletAddress) {
            console.log("Wallet account switched to:", newAddress);
            localStorage.setItem(WALLET_ADDRESS_STORAGE_KEY, newAddress); // Save new address on account switch
            dispatch(setWalletAddress(newAddress));
            dispatch(loadNftsForWallet(newAddress));
        }
    } else {
        console.log("Wallet disconnected via provider.");
        // disconnectWallet thunk will handle clearing storage
        dispatch(disconnectWallet());
    }
};