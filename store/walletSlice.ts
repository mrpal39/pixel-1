/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WalletState {
  walletAddress: string | null;
}

const initialState: WalletState = {
  walletAddress: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setWalletAddress(state, action: PayloadAction<string | null>) {
      state.walletAddress = action.payload;
    },
  },
});

export const { setWalletAddress } = walletSlice.actions;
export default walletSlice.reducer;
