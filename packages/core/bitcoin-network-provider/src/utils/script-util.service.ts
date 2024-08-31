import { Injectable } from '@nestjs/common';
import * as bitcoin from 'bitcoinjs-lib';

@Injectable()
export class ScriptUtilService {
  static getScriptHashFromScriptPubKey(scriptPubKey: any): string | null {
    const { hex, type } = scriptPubKey;
    if (!hex) {
      throw new Error('Invalid scriptPubKey: missing hex');
    }

    const network: bitcoin.Network = bitcoin.networks.testnet;
    const scriptPubKeyBuffer = Buffer.from(hex, 'hex');

    let address: string | null = null;

    switch (type) {
      case 'pubkeyhash':
      case 'scripthash':
      case 'witness_v0_keyhash':
      case 'witness_v0_scripthash':
      case 'witness_v1_taproot':
        address = bitcoin.address.fromOutputScript(scriptPubKeyBuffer, network);
        break;
      case 'pubkey':
        const decompiledScript = bitcoin.script.decompile(scriptPubKeyBuffer);
        if (decompiledScript && decompiledScript.length === 2 && decompiledScript[1] === bitcoin.opcodes.OP_CHECKSIG) {
          address = (decompiledScript[0] as Buffer).toString('hex');
        }
        break;
      case 'multisig':
      case 'witness_unknown':
      case 'nonstandard':
        break;
      case 'nulldata':
        address = 'burned';
        break;
      default:
        break;
    }

    return address;
  }

  static getRuneTokenFromScriptPubKey(scriptPubKey: any): { symbol: string; quantity: number } | null {
    const { hex } = scriptPubKey;

    if (!hex) {
      throw new Error('Invalid scriptPubKey: missing hex');
    }

    const scriptPubKeyBuffer = Buffer.from(hex, 'hex');
    const decompiledScript = bitcoin.script.decompile(scriptPubKeyBuffer);

    if (decompiledScript && decompiledScript[0] === bitcoin.opcodes.OP_RETURN && decompiledScript.length > 1) {
      const dataBuffer = decompiledScript[1] as Buffer;
      const tokenSymbol = dataBuffer.slice(0, 4).toString('utf-8');
      const tokenQuantity = parseInt(dataBuffer.slice(4).toString('hex'), 16);

      return { symbol: tokenSymbol, quantity: tokenQuantity };
    } else {
      return null;
    }
  }

  static getBRC20TokenFromWitness(witness: any): { symbol: string; quantity: number } | null {
    // Placeholder logic for extracting BRC-20 tokens from witness data
    console.log(witness);
    return { symbol: 'BRC', quantity: 100 };
  }

  static isOPReturn(scriptPubKey: any): boolean {
    const { hex } = scriptPubKey;

    if (!hex) {
      // TODO: throw an error
    }

    const scriptPubKeyBuffer = Buffer.from(hex, 'hex');
    const decompiledScript = bitcoin.script.decompile(scriptPubKeyBuffer);

    if (decompiledScript && decompiledScript[0] === bitcoin.opcodes.OP_RETURN) {
      return true;
    } else {
      return false;
    }
  }
}
