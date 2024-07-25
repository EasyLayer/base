import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import { Injectable } from '@nestjs/common';

export class BitcoinWallet {
  address: any;
  mnemonic: any;
  seed: any;
  masterPrivateKey: any;
  publicKey: any;
  privateKey: any;
}

export interface UTXO {
  n: number;
  scriptPubKey: string;
  value: number;
}

@Injectable()
export class BitcoinCryptoUtilsService {
  private ecc: any; // TODO: create type

  // IMPORTANT: We are currently seeing problems with Jest and ecc.
  // In order to test the module normally, we do NOT run the method in the constructor
  // constructor() {
  //   this.initEccLib();
  // }

  private async initEccLib() {
    if (!this.ecc) {
      this.ecc = await import('tiny-secp256k1').catch(() => {
        throw new Error('Failed to load ecc module');
      });
      bitcoin.initEccLib(this.ecc);
    }
  }

  public generateMnemonic(): string {
    const mnemonic = bip39.generateMnemonic();
    return mnemonic;
  }

  public async generateWallet(network: bitcoin.Network): Promise<BitcoinWallet> {
    const mnemonic = this.generateMnemonic();
    return this.walletFromMnemonic(mnemonic, network);
  }

  public async walletFromMnemonic(mnemonic: string, network: bitcoin.Network) {
    await this.initEccLib();
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    const BIP32 = BIP32Factory(this.ecc);

    // The network parameter in the line BIP32.fromSeed(seed, bitcoin.networks.bitcoin)
    // in the context of Bitcoin and the bitcoinjs-lib library indicates that
    // in which network the created wallet will be used.
    // This is important because different networks use different address formats and other parameters,
    // such as prefixes for addresses.
    const root = BIP32.fromSeed(seed, network);

    // we use "!" to tell TypeScript we're sure it's non-null
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const masterPrivateKey: string = root.privateKey!.toString('hex');

    // Select the appropriate path. For example, for BIP44:
    const path = "m/44'/0'/0'/0/0"; // This is an example for the first Bitcoin address

    const child = root.derivePath(path);
    const privateKey = child.privateKey;
    const publicKey = child.publicKey;
    const { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });

    if (!privateKey) {
      throw new Error('Cant create Private Key');
    }

    return {
      address,
      mnemonic,
      seed,
      masterPrivateKey,
      publicKey,
      privateKey,
    } as BitcoinWallet;
  }

  public addressFromPublicKeyBuffer(publicKey: Buffer, network: bitcoin.Network): string {
    const { address } = bitcoin.payments.p2pkh({ pubkey: publicKey, network });
    if (!address) {
      throw new Error('Failed to generate address from public key buffer');
    }
    return address;
  }

  public addressFromPublicKeyHex(publicKey: string, network: bitcoin.Network): string {
    const publicKeyBuffer = Buffer.from(publicKey, 'hex');
    const { address } = bitcoin.payments.p2pkh({ pubkey: publicKeyBuffer, network });
    if (!address) {
      throw new Error('Failed to generate address from public key hex');
    }
    return address;
  }

  public async signTransaction(psbt: bitcoin.Psbt, privateKey: string) {
    await this.initEccLib();
    const ECPair = ECPairFactory(this.ecc);

    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    return psbt.extractTransaction().toHex();
  }

  public async addressFromPrivateKey(privateKey: string): Promise<string> {
    await this.initEccLib();
    const ECPair = ECPairFactory(this.ecc);

    // Creating ECPair from a private key
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
    if (!keyPair.publicKey) {
      throw new Error('Failed to generate public key from private key');
    }

    // Obtaining a public key and creating a Bitcoin address
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
    if (!address) {
      throw new Error('Failed to generate address from private key');
    }

    return address;
  }

  public async getAddressFromScriptPubKey(scriptPubKey: any): Promise<string | null> {
    await this.initEccLib();

    const { hex, type } = scriptPubKey;

    if (!hex) {
      // TODO: throw an error
    }

    // TODO: add to env
    const network: bitcoin.Network = bitcoin.networks.testnet;

    const scriptPubKeyBuffer = Buffer.from(hex, 'hex');

    let address: string | null = null;

    switch (type) {
      case 'pubkeyhash':
      case 'scripthash':
      case 'witness_v0_keyhash':
      case 'witness_v0_scripthash':
        address = bitcoin.address.fromOutputScript(scriptPubKeyBuffer, network);
        break;
      case 'witness_v1_taproot':
        const taprootAddress = bitcoin.payments.p2tr({
          output: scriptPubKeyBuffer,
          network,
        });
        address = taprootAddress.address ?? null;
        break;
      case 'pubkey':
        const decompiledScript = bitcoin.script.decompile(scriptPubKeyBuffer);
        if (decompiledScript && decompiledScript.length === 2 && decompiledScript[1] === bitcoin.opcodes.OP_CHECKSIG) {
          address = (decompiledScript[0] as Buffer).toString('hex');
        }
        break;
      // IMPORTANT: Currently, all outputs with types below will have address = null,
      // but the output record will be written to the database
      // so that it can be referenced by the input in the future.
      case 'multisig':
      case 'witness_unknown':
      case 'nonstandard':
        // address = 'nonstandard';
        break;
      // IMPORTANT: Outputs with type nulldata are coin burners,
      // so these outputs can never be inputs.
      // Logically, we can not insert them into the database at all,
      // but at this stage let them be for now
      case 'nulldata':
        address = 'berned';
        break;
      default:
        break;
    }

    return address;
  }
}
