import {
  RpcResponseAndContext,
  SignatureResult,
  SimulatedTransactionResponse,
} from '@solana/web3.js';

export const getErrorFromRPCResponse = (
  rpcResponse: RpcResponseAndContext<
    SignatureResult | SimulatedTransactionResponse
  >
) => {
  const error = rpcResponse.value.err;
  if (error) {
    if (typeof error === 'object') {
      const errorKeys = Object.keys(error);
      if (errorKeys.length === 1) {
        if (errorKeys[0] !== 'InstructionError') {
          throw new Error(`Unknown RPC error: ${error}`);
        }
        const instructionError = (error as any)['InstructionError'];
        throw new Error(
          `Error in transaction: instruction index ${instructionError[0]}, custom program error ${instructionError[1]['Custom']}`
        );
      }
    }
    throw Error(error.toString());
  }
};
