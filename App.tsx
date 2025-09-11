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

// Mock the window.ethereum object for development environments where a Web3 wallet is not installed.
// This allows testing of wallet-related UI and functionality without a real wallet connection.
if (typeof window.ethereum === 'undefined') {
  console.log("No wallet found. Injecting mock window.ethereum for development.");
  window.ethereum = {
    // A mock request handler
    request: async ({ method }: { method: string; params?: any[] }) => {
      console.log(`Mock ethereum.request called for method: ${method}`);
      // Handle account requests by returning a dummy address
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
        return ['0x1234567890123456789012345678901234567890'];
      }
      if (method === 'net_version' || method === 'eth_chainId') {
        return '80001'; // Mock Polygon Mumbai chain ID
      }
      // For any other method, return null or throw an error as needed
      return null;
    },
    // Mock event listeners
    on: (eventName: string, listener: (...args: any[]) => void) => {
      console.log(`Mock ethereum.on: Listener registered for ${eventName}`);
    },
    removeListener: (eventName: string, listener: (...args: any[]) => void) => {
      console.log(`Mock ethereum.removeListener: Listener removed for ${eventName}`);
    },
  };
}


import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import * as geminiService from './services/geminiService';
import * as polygonService from './services/polygonService';
import Header from './components/Header';
import MintingModal from './components/MintingModal';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import DashboardPage from './pages/DashboardPage';
import NftDetailPage from './pages/NftDetailPage';
import Spinner from './components/Spinner';


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

export type Trait = { trait_type: string; value: string };
export type MintedNft = {
  title: string;
  description: string;
  properties: Trait[];
  imageUrl: string; // Data URL of the minted image
  mintDate: number; // Timestamp of when it was minted
  transactionHash?: string; // On-chain transaction hash
};

export type MintingStatus = {
  step: 'idle' | 'network' | 'uploading' | 'confirming' | 'minting' | 'success' | 'error';
  message: string;
  txHash?: string;
};

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(true); // For non-minting loads
  const [error, setError] = useState<string | null>(null);
  
  // Web3 State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isMintingModalOpen, setIsMintingModalOpen] = useState(false);
  const [nftTraits, setNftTraits] = useState<Trait[]>([]);
  const [myNfts, setMyNfts] = useState<MintedNft[]>([]);
  
  // App navigation
  const navigate = useNavigate();
  const location = useLocation();

  // Effect to handle wallet events: account changes and silent reconnect
  useEffect(() => {
    const { ethereum } = window;
    if (!ethereum) {
        return;
    };

    const silentConnect = async () => {
        try {
            const accounts = await ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                console.log("Wallet silently reconnected:", accounts[0]);
                handleWalletConnected(accounts[0]);
            }
        } catch (err) {
            console.error("Silent wallet connection failed:", err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
            console.log("Wallet account changed to:", accounts[0]);
            handleWalletConnected(accounts[0]);
            // If the user is on a page that depends on wallet state, navigate home
            if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/nft/')) {
                navigate('/');
            }
        } else {
            console.log("Wallet disconnected.");
            handleDisconnectWallet();
        }
    };

    silentConnect();

    ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [navigate, location.pathname]);

  // Load NFTs from localStorage on wallet connect
  useEffect(() => {
      if (walletAddress) {
          const storedNfts = localStorage.getItem(`nfts-${walletAddress}`);
          if (storedNfts) {
              setMyNfts(JSON.parse(storedNfts));
          } else {
              setMyNfts([]);
          }
      } else {
          setMyNfts([]);
      }
  }, [walletAddress]);


  // Session loading effect
  useEffect(() => {
    try {
        const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
            const { history: savedHistoryFiles, historyIndex: savedIndex } = JSON.parse(savedSession);
            if (Array.isArray(savedHistoryFiles) && savedHistoryFiles.length > 0) {
                const filePromises = savedHistoryFiles.map(async (dataUrl, i) => dataURLtoFile(dataUrl, `session-img-${i}.png`));
                Promise.all(filePromises).then(files => {
                    setHistory(files);
                    setHistoryIndex(savedIndex);
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
        setIsLoading(false);
    }
  }, [navigate, location.pathname]);

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

  const addImageToHistory = useCallback((newImageFile: File) => {
    setHistory(currentHistory => {
        const newHistory = currentHistory.slice(0, historyIndex + 1);
        newHistory.push(newImageFile);
        return newHistory;
    });
    setHistoryIndex(prevIndex => prevIndex + 1);
  }, [historyIndex]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files[0]) {
        const file = files[0];
        // Reset history before starting new session
        setHistory([file]);
        setHistoryIndex(0);
        navigate('/editor');
    }
  }, [navigate]);

  const handleGenerateImage = useCallback(async (prompt: string) => {
      setIsLoading(true);
      setError(null);
      try {
          const generatedImageUrl = await geminiService.generateImageFromText(prompt);
          const newImageFile = dataURLtoFile(generatedImageUrl, `generated-${Date.now()}.png`);
          setHistory([newImageFile]);
          setHistoryIndex(0);
          navigate('/editor');
      } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
          setIsLoading(false);
      }
  }, [navigate]);

  const handleCharacterFinalized = useCallback((imageFile: File, traits: Trait[]) => {
    setNftTraits(traits);
    setHistory([imageFile]);
    setHistoryIndex(0);
    navigate('/editor');
  }, [navigate]);

  const handleConnectWallet = async () => {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            handleWalletConnected(accounts[0]);
        } catch (error) {
            console.error("Wallet connection failed:", error);
            setError("Failed to connect wallet. Please try again.");
        }
    } else {
        setError("Please install a Web3 wallet like MetaMask.");
    }
  };

  const handleWalletConnected = (address: string) => {
    setWalletAddress(address);
  };
  
  const handleDisconnectWallet = () => {
      setWalletAddress(null);
      setMyNfts([]);
      navigate('/');
  };
  
  const handleUploadNew = () => {
    // Clear session and navigate home
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setHistory([]);
    setHistoryIndex(-1);
    navigate('/');
  };
  
  const handleOpenMintModal = () => {
    if (!walletAddress) {
        handleConnectWallet();
        return;
    }
    setIsMintingModalOpen(true);
  };

  const handleConfirmMint = async (metadata: { title: string, description: string, properties: Trait[] }, setStatus: (status: MintingStatus) => void) => {
      const currentImageFile = history[historyIndex];
      if (!currentImageFile) {
          setStatus({ step: 'error', message: "No image found to mint." });
          return;
      }

      try {
          const receipt = await polygonService.mintNftOnPolygon(currentImageFile, metadata, setStatus);
          
          if (!receipt || !receipt.hash) {
              throw new Error("Transaction failed or hash not found.");
          }

          const newNft: MintedNft = {
              title: metadata.title,
              description: metadata.description,
              properties: metadata.properties,
              imageUrl: URL.createObjectURL(currentImageFile), // Create a stable URL for the dashboard
              mintDate: Date.now(),
              transactionHash: receipt.hash,
          };

          const updatedNfts = [...myNfts, newNft];
          setMyNfts(updatedNfts);
          if (walletAddress) {
              localStorage.setItem(`nfts-${walletAddress}`, JSON.stringify(updatedNfts));
          }
          
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
      <Header 
        onConnectWallet={handleConnectWallet} 
        onDisconnectWallet={handleDisconnectWallet}
        walletAddress={walletAddress}
        isEditing={history.length > 0}
      />
      <main className="w-full flex-grow p-4 sm:p-8">
        <Routes>
          <Route path="/" element={
            <HomePage 
              onFileSelect={handleFileSelect} 
              onGenerateImage={handleGenerateImage}
              onCharacterFinalized={handleCharacterFinalized}
              isLoading={isLoading} 
            />} 
          />
          <Route path="/editor" element={
            history.length > 0 ? (
              <EditorPage 
                history={history}
                historyIndex={historyIndex}
                setHistory={setHistory}
                setHistoryIndex={setHistoryIndex}
                addImageToHistory={addImageToHistory}
                onUploadNew={handleUploadNew}
                onMint={handleOpenMintModal}
              />
            ) : <Navigate to="/" />
          }/>
          <Route path="/dashboard" element={
            walletAddress ? (
              <DashboardPage nfts={myNfts} />
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
          onClose={() => setIsMintingModalOpen(false)}
          onMint={handleConfirmMint}
          initialProperties={nftTraits}
        />
      )}
    </div>
  );
};

export default App;
