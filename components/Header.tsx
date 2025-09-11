/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WalletIcon } from './icons';
import Tooltip from './Tooltip';

const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624l-.219.874-.219-.874a1.5 1.5 0 00-1.023-1.023l-.874-.219.874-.219a1.5 1.5 0 001.023-1.023l.219-.874.219.874a1.5 1.5 0 001.023 1.023l.874.219-.874.219a1.5 1.5 0 00-1.023 1.023z" />
  </svg>
);

interface HeaderProps {
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  walletAddress: string | null;
}

const Header: React.FC<HeaderProps> = ({ onConnectWallet, onDisconnectWallet, walletAddress }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Effect to close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on navigation
  useEffect(() => {
      setIsDropdownOpen(false);
  }, [location]);

  const handleDisconnect = () => {
    setIsDropdownOpen(false);
    onDisconnectWallet();
  }
  
  return (
    <header className="w-full py-4 px-4 sm:px-8 border-b border-gray-700 bg-gray-800/30 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
          <SparkleIcon className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold tracking-tight text-gray-100">
            Pixshop
          </h1>
      </Link>
      <div className="flex items-center gap-3">
        {walletAddress && (
          <Tooltip text="View your created NFTs">
            <Link
              to="/dashboard"
              className="hidden sm:block bg-white/10 border border-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-sm"
            >
              Dashboard
            </Link>
          </Tooltip>
        )}
        <div className="relative" ref={dropdownRef}>
          {!walletAddress ? (
            <Tooltip text={'Connect your Web3 wallet to mint NFTs.'}>
              <button 
                onClick={onConnectWallet}
                className="flex items-center gap-2 bg-white/10 border border-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-sm"
              >
                <WalletIcon className="w-5 h-5" />
                Connect Wallet
              </button>
            </Tooltip>
          ) : (
             <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-white/10 border border-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-sm"
              >
                <WalletIcon className="w-5 h-5 text-green-400" />
                {`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}
              </button>
          )}

          {isDropdownOpen && walletAddress && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl animate-fade-in z-50 p-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs text-gray-400">Connected Wallet</span>
                <p className="text-sm text-white font-mono break-all bg-gray-900 p-2 rounded-md">{walletAddress}</p>
                <button
                    onClick={handleDisconnect}
                    className="w-full text-center mt-2 bg-red-600/20 border border-red-500/30 text-red-300 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-red-600/40 hover:border-red-500/50 active:scale-95 text-sm"
                >
                    Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;