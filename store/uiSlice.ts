/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Trait } from './nftsSlice';

export interface UiState {
  isMintingModalOpen: boolean;
  nftTraits: Trait[];
}

const initialState: UiState = {
  isMintingModalOpen: false,
  nftTraits: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setIsMintingModalOpen(state, action: PayloadAction<boolean>) {
      state.isMintingModalOpen = action.payload;
    },
    setNftTraits(state, action: PayloadAction<Trait[]>) {
        state.nftTraits = action.payload;
    }
  },
});

export const { setIsMintingModalOpen, setNftTraits } = uiSlice.actions;
export default uiSlice.reducer;
