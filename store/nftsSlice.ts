/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Shared types
export type Trait = { trait_type: string; value: string };
export type MintedNft = {
  title: string;
  description: string;
  properties: Trait[];
  imageUrl: string;
  mintDate: number;
  transactionHash?: string;
};

export interface NftsState {
  myNfts: MintedNft[];
}

const initialState: NftsState = {
  myNfts: [],
};

const nftsSlice = createSlice({
  name: 'nfts',
  initialState,
  reducers: {
    setNfts(state, action: PayloadAction<MintedNft[]>) {
      state.myNfts = action.payload;
    },
    addNft(state, action: PayloadAction<MintedNft>) {
      state.myNfts.push(action.payload);
    },
  },
});

export const { setNfts, addNft } = nftsSlice.actions;
export default nftsSlice.reducer;
