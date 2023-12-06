const axios = require('axios');
const { sign } = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');
const config = require('../../../configuration/config.json');
const common = require('../../../configuration/common');
const schemaValidator = require('../../../configuration/schemaValidator');

class WalletFireblocks {

    constructor (options){
        this.baseUrl = options.baseUrl?(options.baseUrl):config.fireblocks.baseUrl;
        this.apiSecret = options.apiSecret;
        this.apiKey = options.apiKey;
    }

    jwtSign(path, data){
        const token = sign({
            uri: path,
            nonce: uuid(),
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 55,
            sub: this.apiKey,
            bodyHash: crypto.createHash("sha256").update(JSON.stringify(data || "")).digest().toString("hex")
        }, this.apiSecret, {algorithm: "RS256"});
        return token;
    }


    signTransaction = async (transactionObject) => {
        try{

            const configuration = { "params": {} };
            transactionObject.function = "FireblockSign()";
            const validJson = await schemaValidator.validateInput(transactionObject);

            if(! validJson.valid){
                return validJson;
            }

            const chainId = await common.getChainId({chainId:transactionObject.chainId,chainSymbol:transactionObject.chainSymbol});
            let chainName = config.chains[chainId].chainName;

            const txData = {}
            txData.operation = (transactionObject.data)?"CONTRACT_CALL":"TRANSFER",
            txData.source = {
                "type": "VAULT_ACCOUNT",
                "id": transactionObject.from
            },
            txData.destination = {
                "type": "ONE_TIME_ADDRESS",
                "oneTimeAddress": {
                    "address": transactionObject.to
                }
            }
            txData.assetId = (transactionObject.assetId)?(transactionObject.assetId):"BASE",
            txData.amount = (transactionObject.amount)?(transactionObject.amount):'0.00000000001',
            txData.note =  (transactionObject.note)?(transactionObject.note):"hey"
        

            if(transactionObject.data){
                txData.extraParameters = {
                    "contractCallData": transactionObject.data
                }
            }

            const signature = this.jwtSign("/v1/transactions", txData);
            const rawTx = {
                "jwt": signature,
                "path": config.fireblocks.createTransaction,
                "data": txData,
                "method": "POST"
            }
            return rawTx;
            
        } catch(error){
            return error;
        }
    }

    sendTransaction = async (rawTx) => {
    

        try{

            const options = rawTx ;
            options.function = "SendFireblocks()";
            const validJson = await schemaValidator.validateInput(options);

            if ( !validJson.valid ) {
                return (validJson);
            }

                
            const resp = await axios({
                url: `${this.baseUrl}${rawTx.path}`,
                method: rawTx.method,
                data: rawTx.data,
                headers: {
                    "X-API-Key": this.apiKey,
                    "Authorization": `Bearer ${rawTx.jwt}`
                }
            })

            return resp.data;
        } catch(error){
            console.log(error);
            return error;
        }

    }

}

module.exports = { WalletFireblocks }



