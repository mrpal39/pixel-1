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
};

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true for session check
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
                setWalletAddress(accounts[0]);
            }
        } catch (err) {
            console.error("Error during silent wallet connection check:", err);
        }
    };
    silentConnect();

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress(null);
        navigate('/');
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      if (ethereum.removeListener) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [navigate]);

  // Effect to load user's created NFTs from localStorage when wallet connects
  useEffect(() => {
    if (walletAddress) {
      try {
        const storageKey = `pixshop-creations-${walletAddress}`;
        const nftsRaw = localStorage.getItem(storageKey);
        const nfts = nftsRaw ? JSON.parse(nftsRaw) : [];
        setMyNfts(nfts);
      } catch (e) {
        console.error("Failed to load user creations from localStorage", e);
        setMyNfts([]);
      }
    } else {
      setMyNfts([]);
    }
  }, [walletAddress]);


  // Effect to load session from localStorage on initial component mount
  useEffect(() => {
    const loadSession = async () => {
      const savedSessionJSON = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSessionJSON) {
        try {
          const savedSession = JSON.parse(savedSessionJSON);
          if (savedSession.history && savedSession.history.length > 0 && savedSession.index !== undefined) {
            const fileHistory = savedSession.history.map((item: { dataUrl: string; name: string }) =>
              dataURLtoFile(item.dataUrl, item.name)
            );
            setHistory(fileHistory);
            setHistoryIndex(savedSession.index);
            // Only navigate if not already on a page (avoid overriding deep links)
            if (location.pathname === '/') {
              navigate('/editor');
            }
          }
        } catch (e) {
          console.error("Failed to load session from localStorage", e);
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
      setIsLoading(false); // Finished loading attempt
    };
    loadSession();
  }, [location.pathname, navigate]);

  // Effect to save session to localStorage whenever history or the current index changes
  useEffect(() => {
    const saveSession = async () => {
      if (history.length === 0 || historyIndex < 0) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }
      try {
        const serializableHistory = await Promise.all(
          history.map(async (file) => ({
            dataUrl: await fileToDataURL(file),
            name: file.name,
          }))
        );
        const session = {
          history: serializableHistory,
          index: historyIndex,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch (e) {
        console.error("Failed to save session to localStorage", e);
      }
    };
    saveSession();
  }, [history, historyIndex]);


  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    navigate('/editor');
    setNftTraits([]);
  }, [navigate]);

  const handleGenerateImage = useCallback(async (generationPrompt: string) => {
    if (!generationPrompt.trim()) {
        setError('Please enter a prompt to generate an image.');
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const generatedImageUrl = await geminiService.generateImageFromText(generationPrompt);
        const newImageFile = dataURLtoFile(generatedImageUrl, `generated-${Date.now()}.png`);
        setHistory([newImageFile]);
        setHistoryIndex(0);
        navigate('/editor');
        setNftTraits([]);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [navigate]);

  const handleCharacterFinalized = useCallback((imageFile: File, traits: Trait[]) => {
      setHistory([imageFile]);
      setHistoryIndex(0);
      navigate('/editor');
      setNftTraits(traits);
  }, [navigate]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      navigate('/');
  }, [navigate]);
  
  const handleConnectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      } catch (err) {
        console.error("User rejected wallet connection", err);
        setError("You must connect your wallet to proceed.");
      }
    } else {
      setError("Please install a Web3 wallet like MetaMask.");
    }
  };

  const handleDisconnectWallet = () => {
    setWalletAddress(null);
    navigate('/');
  };

  const handleMint = async (metadata: { title: string, description: string, properties: Trait[], royalties: number }) => {
    const currentImageFile = history[historyIndex];
    if (!walletAddress || !currentImageFile) {
        setError("Wallet not connected or no image to mint.");
        return;
    }
    
    setIsLoading(true);
    
    try {
        const imageDataUrl = await fileToDataURL(currentImageFile);
        const newNft: MintedNft = {
            title: metadata.title,
            description: metadata.description,
            properties: metadata.properties,
            imageUrl: imageDataUrl,
            mintDate: Date.now(),
        };

        await new Promise(resolve => setTimeout(resolve, 2000));

        const storageKey = `pixshop-creations-${walletAddress}`;
        const existingCreationsRaw = localStorage.getItem(storageKey);
        const existingCreations: MintedNft[] = existingCreationsRaw ? JSON.parse(existingCreationsRaw) : [];
        const updatedCreations = [...existingCreations, newNft];
        localStorage.setItem(storageKey, JSON.stringify(updatedCreations));

        setMyNfts(updatedCreations);
        setIsMintingModalOpen(false);
        alert(`Congratulations! Your NFT "${metadata.title}" has been successfully minted.`);
        navigate('/dashboard');

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to mint NFT. ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  };
    
  const currentImageUrl = historyIndex >= 0 ? URL.createObjectURL(history[historyIndex]) : null;
  useEffect(() => {
    return () => {
      if (currentImageUrl) {
        URL.revokeObjectURL(currentImageUrl);
      }
    }
  }, [currentImageUrl]);

  const NftDetailWrapper: React.FC = () => {
      const { index } = useParams();
      if (!walletAddress) return <Navigate to="/" replace />;
      const nftIndex = parseInt(index || '', 10);
      if (isNaN(nftIndex)) return <Navigate to="/dashboard" replace />;
      const nft = myNfts[nftIndex];
      if (!nft) return <Navigate to="/dashboard" replace />;
      return <NftDetailPage nft={nft} />;
  };

  const renderAppContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4">
          <Spinner />
          <p className="text-gray-300">Loading...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
          <p className="text-md text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return (
      <Routes>
        <Route path="/" element={
          <HomePage
            onFileSelect={(files) => files && files[0] && handleImageUpload(files[0])}
            onGenerateImage={handleGenerateImage}
            onCharacterFinalized={handleCharacterFinalized}
            isLoading={isLoading}
          />
        } />
        <Route path="/editor" element={
          historyIndex < 0 || !history[historyIndex] ? <Navigate to="/" replace /> : (
            <EditorPage 
              history={history}
              historyIndex={historyIndex}
              setHistory={setHistory}
              setHistoryIndex={setHistoryIndex}
              addImageToHistory={addImageToHistory}
              onUploadNew={handleUploadNew}
              onMint={() => {
                if (walletAddress) {
                  setIsMintingModalOpen(true);
                } else {
                  handleConnectWallet();
                }
              }}
            />
          )
        } />
        <Route path="/dashboard" element={
            !walletAddress ? <Navigate to="/" replace /> : <DashboardPage nfts={myNfts} /> 
        } />
        <Route path="/nft/:index" element={<NftDetailWrapper />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  };


  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header 
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        walletAddress={walletAddress}
      />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center items-start`}>
        {renderAppContent()}
      </main>
      {isMintingModalOpen && currentImageUrl && (
        <MintingModal
          imageUrl={currentImageUrl}
          onClose={() => setIsMintingModalOpen(false)}
          onMint={handleMint}
          isLoading={isLoading}
          initialProperties={nftTraits}
        />
      )}
    </div>
  );
};

export default App;