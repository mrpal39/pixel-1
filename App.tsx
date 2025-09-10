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


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import * as geminiService from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import UpscalePanel from './components/UpscalePanel';
import StylePresetPanel from './components/ArtStylePanel';
import HistoryPanel from './components/HistoryPanel';
import CompareSlider from './components/CompareSlider';
import MagicEraserPanel from './components/MagicEraserPanel';
import GeneratePanel from './components/GeneratePanel';
import CharacterCreator from './components/CharacterCreator';
import CollectionPanel from './components/CollectionPanel';
import MintingModal from './components/MintingModal';
import Tooltip from './components/Tooltip';
import { EyeIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import Dashboard from './components/Dashboard';

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


type Tab = 'generate' | 'character' | 'collection' | 'generative fill' | 'magic eraser' | 'adjust' | 'filters' | 'style presets' | 'crop' | 'upscale';
type Trait = { trait_type: string; value: string };
type MintedNft = {
  title: string;
  description: string;
  properties: Trait[];
  imageUrl: string; // Data URL of the minted image
};
type View = 'start' | 'editor' | 'dashboard';

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [historyImageUrls, setHistoryImageUrls] = useState<string[]>([]);
  
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);

  // Web3 State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isMintingModalOpen, setIsMintingModalOpen] = useState(false);
  const [nftTraits, setNftTraits] = useState<Trait[]>([]);
  const [myNfts, setMyNfts] = useState<MintedNft[]>([]);
  
  // App navigation state
  const [currentView, setCurrentView] = useState<View>('start');

  // Refs for image and canvases
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Magic Eraser State
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(30);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });

  // Effect to handle wallet events: account changes and silent reconnect
  useEffect(() => {
    const { ethereum } = window;
    if (!ethereum) {
        // If there's no wallet, we can't do anything.
        // The user will be prompted to install one if they click connect.
        return;
    };

    // Try to connect silently on load if previously connected
    const silentConnect = async () => {
        try {
            // eth_accounts returns an array of accounts if the user has authorized the site, otherwise an empty array.
            const accounts = await ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                setWalletAddress(accounts[0]);
            }
        } catch (err) {
            console.error("Error during silent wallet connection check:", err);
        }
    };
    silentConnect();

    // Handle when the user changes their account in the wallet
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        // The user has disconnected their account.
        setWalletAddress(null);
        setCurrentView('start'); // Go to start screen on disconnect
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);

    // Cleanup: remove the listener when the component is unmounted
    return () => {
      if (ethereum.removeListener) { // Good practice to check if removeListener exists
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

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
      setMyNfts([]); // Clear NFTs if wallet disconnects
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
            setIsLoading(true); // Show a general loader while hydrating the state
            const fileHistory = savedSession.history.map((item: { dataUrl: string; name: string }) =>
              dataURLtoFile(item.dataUrl, item.name)
            );
            setHistory(fileHistory);
            setHistoryIndex(savedSession.index);
            setActiveTab('generative fill'); // Default to a useful tab if loading existing work
            setCurrentView('editor');
            setIsLoading(false);
          }
        } catch (e) {
          console.error("Failed to load session from localStorage", e);
          localStorage.removeItem(SESSION_STORAGE_KEY); // Clear corrupted data
        }
      }
    };
    loadSession();
  }, []); // Empty dependency array ensures this runs only once on mount

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

  // Effect to create/revoke object URLs for the entire history stack
  useEffect(() => {
    const newUrls = history.map(file => URL.createObjectURL(file));
    setHistoryImageUrls(newUrls);
    return () => {
        newUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [history]);

  // FIX: Moved currentImageUrl and originalImageUrl declarations before they are used in the useEffect hook below.
  const currentImageUrl = historyImageUrls[historyIndex] ?? null;
  const originalImageUrl = historyImageUrls[0] ?? null;

  // Effect for resizing the magic eraser canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imgRef.current;

    const resizeCanvas = () => {
      if (activeTab === 'magic eraser' && canvas && image && image.clientHeight > 0) {
        if (canvas.width !== image.clientWidth || canvas.height !== image.clientHeight) {
          canvas.width = image.clientWidth;
          canvas.height = image.clientHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setMaskDataUrl(null);
          }
        }
      }
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (image) {
      image.addEventListener('load', resizeCanvas, { once: true });
      resizeObserver.observe(image);
    }

    return () => {
      if (image) {
        resizeObserver.unobserve(image);
      }
    };
  }, [currentImageUrl, activeTab]);

  const canUndo = historyIndex > 0;

  const addImageToHistory = useCallback((newImageFile: File, newTab?: Tab) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Reset any tool-specific states
    setCrop(undefined);
    setCompletedCrop(undefined);
    setMaskDataUrl(null);
    if(newTab) setActiveTab(newTab);
    if(canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('generative fill');
    setCurrentView('editor');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setNftTraits([]); // Clear traits for new image
  }, []);

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
        addImageToHistory(newImageFile, 'generative fill');
        setCurrentView('editor');
        setNftTraits([]);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [addImageToHistory]);

  const handleCharacterFinalized = useCallback((imageFile: File, traits: Trait[]) => {
      addImageToHistory(imageFile, 'generative fill');
      setCurrentView('editor');
      setNftTraits(traits);
  }, [addImageToHistory]);

  const handleGenerate = useCallback(async () => {
    const currentImage = history[historyIndex];
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await geminiService.generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [history, historyIndex, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    const currentImage = history[historyIndex];
    if (!currentImage) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const filteredImageUrl = await geminiService.generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [history, historyIndex, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    const currentImage = history[historyIndex];
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const adjustedImageUrl = await geminiService.generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [history, historyIndex, addImageToHistory]);

  const handleRemoveBackground = useCallback(async () => {
    const currentImage = history[historyIndex];
    if (!currentImage) {
      setError('No image loaded to remove the background from.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const resultImageUrl = await geminiService.removeImageBackground(currentImage);
        const newImageFile = dataURLtoFile(resultImageUrl, `bg-removed-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to remove the background. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [history, historyIndex, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  const handleUpscale = useCallback(async (scaleFactor: number) => {
    const currentImage = history[historyIndex];
    if (!currentImage) {
        setError('No image loaded to upscale.');
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const upscaledImageUrl = await geminiService.upscaleImage(currentImage, scaleFactor);
        const newImageFile = dataURLtoFile(upscaledImageUrl, `upscaled-${scaleFactor}x-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to upscale the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [history, historyIndex, addImageToHistory]);
  
  const handleApplyArtStyle = useCallback(async (stylePrompt: string) => {
    const currentImage = history[historyIndex];
    if (!currentImage) {
      setError('No image loaded to apply a style to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const styledImageUrl = await geminiService.generateArtStyleImage(currentImage, stylePrompt);
        const newImageFile = dataURLtoFile(styledImageUrl, `styled-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the art style. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [history, historyIndex, addImageToHistory]);

  const handleMagicErase = useCallback(async () => {
    const currentImage = history[historyIndex];
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    if (!maskDataUrl || !canvasRef.current) {
        setError('Please paint over the object you want to remove first.');
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
        // Create a mask file that has the same dimensions as the original image
        const maskCanvas = document.createElement('canvas');
        const image = imgRef.current;
        if (!image) throw new Error("Image reference is not available.");

        maskCanvas.width = image.naturalWidth;
        maskCanvas.height = image.naturalHeight;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) throw new Error("Could not create mask canvas context.");

        maskCtx.drawImage(canvasRef.current, 0, 0, image.naturalWidth, image.naturalHeight);
        const finalMaskDataUrl = maskCanvas.toDataURL('image/png');
        const maskFile = dataURLtoFile(finalMaskDataUrl, `mask-${Date.now()}.png`);

        const resultUrl = await geminiService.removeObjectWithMask(currentImage, maskFile);
        const newImageFile = dataURLtoFile(resultUrl, `erased-${Date.now()}.png`);
        addImageToHistory(newImageFile);

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to perform magic erase. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [history, historyIndex, maskDataUrl, addImageToHistory]);


  const handleHistoryNavigation = useCallback((index: number) => {
    if (index >= 0 && index < history.length) {
      setHistoryIndex(index);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [history.length]);
  
  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
      setActiveTab('generate');
      setCurrentView('start');
  }, []);

  const handleExport = useCallback(() => {
      const currentImage = history[historyIndex];
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `pixshop-art-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [history, historyIndex]);

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
        };

        // Simulate minting process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Save to our "backend" (localStorage)
        const storageKey = `pixshop-creations-${walletAddress}`;
        const existingCreationsRaw = localStorage.getItem(storageKey);
        const existingCreations: MintedNft[] = existingCreationsRaw ? JSON.parse(existingCreationsRaw) : [];
        const updatedCreations = [...existingCreations, newNft];
        localStorage.setItem(storageKey, JSON.stringify(updatedCreations));

        setMyNfts(updatedCreations);
        setIsMintingModalOpen(false);
        alert(`Congratulations! Your NFT "${metadata.title}" has been successfully minted.`);
        setCurrentView('dashboard');

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to mint NFT. ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'generative fill') return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDisplayHotspot({ x: offsetX, y: offsetY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    setEditHotspot({ x: originalX, y: originalY });
  };
  
  const handleTabChange = (tab: Tab) => {
    if (tab === 'crop' || tab === 'magic eraser') {
        setIsCompareMode(false); // Exit compare mode when using these tools
    }
    setActiveTab(tab);
  };

  // -- Magic Eraser Drawing Handlers --
  const getCoords = (e: React.MouseEvent | React.TouchEvent): {x: number, y: number} => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    setIsDrawing(true);
    ctx.beginPath();
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'white';
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finishDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;
    setIsDrawing(false);
    const dataUrl = canvas.toDataURL();
    setMaskDataUrl(dataUrl);
  };

  const handleClearMask = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setMaskDataUrl(null);
    }
  }, []);

  const handleCanvasContainerMouseMove = (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  
  const navigateToDashboard = () => {
      if (walletAddress) {
          setCurrentView('dashboard');
      } else {
          handleConnectWallet();
      }
  }
  
  const navigateHome = () => {
      setCurrentView(history.length > 0 ? 'editor' : 'start');
  }

  const renderContent = () => {
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
    
    switch (currentView) {
        case 'dashboard':
            return <Dashboard nfts={myNfts} onCreateNew={() => setCurrentView('start')} />;

        case 'editor':
             if (!currentImageUrl) {
                // This state can happen if user navigates away and history is cleared. Redirect to start.
                setCurrentView('start');
                return null;
            }
            const imageDisplay = (
              <img
                  ref={imgRef}
                  key={currentImageUrl}
                  src={currentImageUrl}
                  alt="Current"
                  onClick={handleImageClick}
                  className={`w-full h-auto object-contain max-h-[60vh] rounded-xl ${activeTab === 'generative fill' ? 'cursor-crosshair' : ''}`}
              />
            );
            
            const cropImageElement = (
              <img 
                ref={imgRef}
                key={`crop-${currentImageUrl}`}
                src={currentImageUrl} 
                alt="Crop this image"
                className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
              />
            );

            return (
              <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
                <div 
                  className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20 flex justify-center items-center max-h-[60vh]"
                  onMouseMove={activeTab === 'magic eraser' ? handleCanvasContainerMouseMove : undefined}
                  onMouseLeave={activeTab === 'magic eraser' ? () => setCursorPos({x: -100, y: -100}) : undefined}
                  style={activeTab === 'magic eraser' ? { cursor: 'none' } : {}}
                >
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                            <Spinner />
                            <p className="text-gray-300">AI is working its magic...</p>
                        </div>
                    )}
                    
                    {isCompareMode && originalImageUrl && currentImageUrl ? (
                        <CompareSlider 
                            beforeImageUrl={originalImageUrl} 
                            afterImageUrl={currentImageUrl} 
                        />
                    ) : activeTab === 'crop' ? (
                      <ReactCrop 
                        crop={crop} 
                        onChange={c => setCrop(c)} 
                        onComplete={c => setCompletedCrop(c)}
                        aspect={aspect}
                        className="max-h-[60vh]"
                      >
                        {cropImageElement}
                      </ReactCrop>
                    ) : imageDisplay }
                    
                    {activeTab === 'magic eraser' && (
                      <>
                        <canvas
                          ref={canvasRef}
                          className="absolute top-0 left-0 w-full h-full opacity-50 pointer-events-auto z-20"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={finishDrawing}
                          onMouseLeave={finishDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={finishDrawing}
                        />
                         <div
                          className="absolute rounded-full border-2 border-white bg-white/20 pointer-events-none -translate-x-1/2 -translate-y-1/2 z-30"
                          style={{
                            left: `${cursorPos.x}px`,
                            top: `${cursorPos.y}px`,
                            width: `${brushSize}px`,
                            height: `${brushSize}px`,
                          }}
                         />
                      </>
                    )}

                    {displayHotspot && !isLoading && activeTab === 'generative fill' && !isCompareMode && (
                        <div 
                            className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                            style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                        >
                            <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                        </div>
                    )}
                </div>
                
                <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 grid grid-cols-4 md:grid-cols-8 items-center justify-center gap-2 backdrop-blur-sm">
                    {(['generative fill', 'magic eraser', 'adjust', 'filters', 'style presets', 'crop', 'upscale'] as Tab[]).map(tab => (
                         <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`w-full capitalize font-semibold py-3 px-2 md:px-5 rounded-md transition-all duration-200 text-sm md:text-base ${
                                activeTab === tab 
                                ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                                : 'text-gray-300 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                
                <div className="w-full">
                    {activeTab === 'generative fill' && (
                        <div className="flex flex-col items-center gap-4">
                            <p className="text-md text-gray-400">
                                {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                            </p>
                            <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                                <input
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                                    className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={isLoading || !editHotspot}
                                />
                                <Tooltip text="Apply the described edit to the selected point.">
                                    <button 
                                        type="submit"
                                        className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                                        disabled={isLoading || !prompt.trim() || !editHotspot}
                                    >
                                        Generate
                                    </button>
                                </Tooltip>
                            </form>
                        </div>
                    )}
                    {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
                    {activeTab === 'magic eraser' && <MagicEraserPanel onMagicErase={handleMagicErase} onClearMask={handleClearMask} isMasked={!!maskDataUrl} brushSize={brushSize} onBrushSizeChange={setBrushSize} isLoading={isLoading} />}
                    {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} onRemoveBackground={handleRemoveBackground} isLoading={isLoading} />}
                    {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
                    {activeTab === 'style presets' && <StylePresetPanel onApplyArtStyle={handleApplyArtStyle} onReset={handleReset} isLoading={isLoading} originalImageUrl={originalImageUrl} />}
                    {activeTab === 'upscale' && <UpscalePanel onApplyUpscale={handleUpscale} isLoading={isLoading} />}
                </div>
                
                {historyImageUrls.length > 1 && (
                  <HistoryPanel
                    historyUrls={historyImageUrls}
                    currentIndex={historyIndex}
                    onNavigate={handleHistoryNavigation}
                  />
                )}
                
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                    {canUndo && activeTab !== 'crop' && activeTab !== 'magic eraser' && (
                      <Tooltip text="Toggle a slider to compare with the original image.">
                        <button
                            onClick={() => setIsCompareMode(!isCompareMode)}
                            className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
                            aria-label="Toggle before/after comparison view"
                        >
                            <EyeIcon className="w-5 h-5 mr-2" />
                            {isCompareMode ? 'Exit Compare' : 'Compare'}
                        </button>
                      </Tooltip>
                    )}

                    <Tooltip text="Revert all changes and go back to the original image.">
                        <button 
                            onClick={handleReset}
                            disabled={!canUndo}
                            className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
                          >
                            Reset
                        </button>
                    </Tooltip>
                    <Tooltip text="Upload a new image and clear the current session.">
                        <button 
                            onClick={handleUploadNew}
                            className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
                        >
                            Start Over
                        </button>
                    </Tooltip>

                     <Tooltip text="Download the current image to your device.">
                         <button 
                            onClick={handleExport}
                            className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
                        >
                            Export
                        </button>
                    </Tooltip>

                    <Tooltip text="Prepare and mint your artwork as an NFT on the blockchain.">
                        <button 
                            onClick={() => {
                              if (walletAddress) {
                                setIsMintingModalOpen(true);
                              } else {
                                handleConnectWallet();
                              }
                            }}
                            className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
                        >
                            Mint NFT
                        </button>
                    </Tooltip>
                </div>
              </div>
            );
        
        case 'start':
        default:
             const startTabs: Tab[] = ['generate', 'character', 'collection'];
              return isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-4">
                      <Spinner />
                      <p className="text-gray-300">Restoring your session...</p>
                  </div>
              ) : (
                <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
                  <StartScreen onFileSelect={handleFileSelect} />
                  <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 grid grid-cols-3 items-center justify-center gap-2 backdrop-blur-sm">
                    {startTabs.map(tab => (
                         <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`w-full capitalize font-semibold py-3 px-2 md:px-5 rounded-md transition-all duration-200 text-sm md:text-base ${
                                activeTab === tab 
                                ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                                : 'text-gray-300 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                  </div>
                  {activeTab === 'generate' && <GeneratePanel onGenerate={handleGenerateImage} isLoading={isLoading} />}
                  {activeTab === 'character' && <CharacterCreator onFinalize={handleCharacterFinalized} />}
                  {activeTab === 'collection' && <CollectionPanel />}
                </div>
              );
    }
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header 
        onConnectWallet={handleConnectWallet} 
        walletAddress={walletAddress}
        onNavigateToDashboard={navigateToDashboard}
        onNavigateHome={navigateHome}
      />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center items-start`}>
        {renderContent()}
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