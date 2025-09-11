/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Fix for Error on line 511, 513: Property 'ethereum' does not exist on type 'Window & typeof globalThis'.
// Add a global type declaration for the Window interface to include the `ethereum` object injected by Web3 wallets.
declare global {
  interface Window {
    ethereum: any;
  }
}

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from './store';
import {
  setHistoryState,
  resetHistory,
  setIsLoading,
  setError,
} from './store/editorSlice';
import { addNft } from './store/nftsSlice';
import { setIsMintingModalOpen } from './store/uiSlice';
import { silentConnect, handleAccountsChanged } from './store/walletActions';
import * as polygonService from './services/polygonService';
import { DEFAULT_CONTRACT_ADDRESS, DEFAULT_NETWORK } from './services/polygonService';
import Header from './components/Header';
import MintingModal from './components/MintingModal';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import DashboardPage from './pages/DashboardPage';
import NftDetailPage from './pages/NftDetailPage';
import Spinner from './components/Spinner';

// Re-export core types from slices for other components to use
import { Trait, MintedNft } from './store/nftsSlice';
export type { Trait, MintedNft };


const SESSION_STORAGE_KEY = 'pixshop-session';

// Helper to convert a data URL string to a File object
export const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// Helper to convert a File object to a data URL string
const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export type MintingStatus = {
  step: 'idle' | 'network' | 'uploading' | 'confirming' | 'minting' | 'success' | 'error';
  message: string;
  txHash?: string;
};

const App: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { history, historyIndex, isLoading } = useSelector((state: RootState) => state.editor);
  const { walletAddress } = useSelector((state: RootState) => state.wallet);
  const { myNfts } = useSelector((state: RootState) => state.nfts);
  const { isMintingModalOpen, nftTraits } = useSelector((state: RootState) => state.ui);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Effect to handle wallet events: account changes and silent reconnect
  useEffect(() => {
    const { ethereum } = window;
    if (!ethereum) {
        dispatch(setIsLoading(false));
        return;
    };

    const onAccountsChanged = (accounts: string[]) => {
      // Dispatch the thunk to handle the logic
      dispatch(handleAccountsChanged(accounts));
      
      // Handle navigation side-effect in the component
      if (accounts.length > 0) {
        // If user switches account while on a dashboard/nft page, send them home
        if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/nft/')) {
          navigate('/');
        }
      } else {
        // If user disconnects, send them home
        navigate('/');
      }
    };
    
    // Dispatch thunk to check for existing connection on page load
    dispatch(silentConnect());

    ethereum.on('accountsChanged', onAccountsChanged);
    return () => {
        ethereum.removeListener('accountsChanged', onAccountsChanged);
    };
  }, [dispatch, navigate, location.pathname]);

  // Save NFTs to localStorage whenever the list changes (e.g., after minting or reordering)
  useEffect(() => {
    if (walletAddress) {
        localStorage.setItem(`nfts-${walletAddress}`, JSON.stringify(myNfts));
    }
  }, [myNfts, walletAddress]);


  // Session loading effect
  useEffect(() => {
    try {
        const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
            const { history: savedHistoryFiles, historyIndex: savedIndex } = JSON.parse(savedSession);
            if (Array.isArray(savedHistoryFiles) && savedHistoryFiles.length > 0) {
                const filePromises = savedHistoryFiles.map(async (dataUrl, i) => dataURLtoFile(dataUrl, `session-img-${i}.png`));
                Promise.all(filePromises).then(files => {
                    dispatch(setHistoryState({ history: files, historyIndex: savedIndex }));
                    if (location.pathname === '/') {
                        navigate('/editor');
                    }
                });
            }
        }
    } catch (err) {
        console.error("Failed to load session:", err);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
        // Only set loading to false if silentConnect hasn't already
        if (isLoading) {
            dispatch(setIsLoading(false));
        }
    }
  }, [dispatch, navigate, location.pathname, isLoading]);

  // Session saving effect
  useEffect(() => {
    const saveSession = async () => {
        if (history.length > 0 && historyIndex >= 0) {
            try {
                const dataUrlPromises = history.map(file => fileToDataURL(file));
                const historyDataUrls = await Promise.all(dataUrlPromises);
                const sessionData = {
                    history: historyDataUrls,
                    historyIndex: historyIndex,
                };
                sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
            } catch (err) {
                console.error("Failed to save session:", err);
            }
        }
    };
    saveSession();
  }, [history, historyIndex]);

  
  const handleUploadNew = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    dispatch(resetHistory());
    navigate('/');
  };
  
  const handleOpenMintModal = () => {
    if (!walletAddress) {
        // The header's connect button dispatches the connect thunk directly,
        // but we can also trigger it from here if needed.
        // For now, let's assume the user clicks the header button first.
        dispatch(setError("Please connect your wallet to mint."));
        return;
    }
    dispatch(setIsMintingModalOpen(true));
  };

  const handleConfirmMint = async (metadata: { title: string, description: string, properties: Trait[] }, setStatus: (status: MintingStatus) => void) => {
      const currentImageFile = history[historyIndex];
      if (!currentImageFile) {
          setStatus({ step: 'error', message: "No image found to mint." });
          return;
      }

      const contractAddress = localStorage.getItem('pixshop-contract-address') || DEFAULT_CONTRACT_ADDRESS;
      const networkName = (localStorage.getItem('pixshop-network') as 'polygon-mainnet' | 'polygon-mumbai' | 'mega-testnet' | null) || DEFAULT_NETWORK;

      if (!contractAddress || contractAddress === '0x...' || contractAddress.trim() === '') {
          setStatus({ step: 'error', message: 'Contract address is not configured. Please set it in the "Minter" tab on the Home page, or update the placeholder in the services/polygonService.ts file.' });
          return;
      }

      // Fix: Validate networkName from localStorage to ensure it matches the expected type.
      if (networkName !== 'polygon-mainnet' && networkName !== 'polygon-mumbai' && networkName !== 'mega-testnet') {
          setStatus({ step: 'error', message: `Invalid network configured: "${networkName}". Please select a valid network in the "Minter" tab.` });
          return;
      }

      try {
          const receipt = await polygonService.mintNftOnPolygon(
            currentImageFile, 
            metadata, 
            setStatus, 
            { contractAddress, networkName }
          );
          
          if (!receipt || !receipt.hash) {
              throw new Error("Transaction failed or hash not found.");
          }

          const newNft: MintedNft = {
              title: metadata.title,
              description: metadata.description,
              properties: metadata.properties,
              imageUrl: URL.createObjectURL(currentImageFile),
              mintDate: Date.now(),
              transactionHash: receipt.hash,
          };
          
          dispatch(addNft(newNft));
          
          setStatus({ step: 'success', message: 'Your NFT has been successfully minted!', txHash: receipt.hash });

      } catch (error: any) {
          console.error("Minting process failed in App:", error);
          setStatus({ step: 'error', message: error.message || "An unexpected error occurred during minting." });
      }
  };
  
  const NftDetailWrapper = () => {
    const { index } = useParams();
    const nftIndex = parseInt(index || '', 10);
    if (isNaN(nftIndex) || nftIndex < 0 || nftIndex >= myNfts.length) {
      return <Navigate to="/dashboard" />;
    }
    return <NftDetailPage nft={myNfts[nftIndex]} />;
  };
  
  if (isLoading && history.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-screen">
            <Spinner />
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center">
      <Header />
      <main className="w-full flex-grow p-4 sm:p-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor" element={
            history.length > 0 ? (
              <EditorPage 
                onUploadNew={handleUploadNew}
                onMint={handleOpenMintModal}
              />
            ) : <Navigate to="/" />
          }/>
          <Route path="/dashboard" element={
            walletAddress ? (
              <DashboardPage />
            ) : <Navigate to="/" />
          }/>
           <Route path="/nft/:index" element={
             walletAddress ? <NftDetailWrapper /> : <Navigate to="/" />
           } />
        </Routes>
      </main>
      
      {isMintingModalOpen && history[historyIndex] && (
        <MintingModal 
          imageUrl={URL.createObjectURL(history[historyIndex])}
          onClose={() => dispatch(setIsMintingModalOpen(false))}
          onMint={handleConfirmMint}
          initialProperties={nftTraits}
        />
      )}
    </div>
  );
};

export default App;