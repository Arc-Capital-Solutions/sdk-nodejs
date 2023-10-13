const Ethereum = require('./Ethereum');
const Solana = require('./Solana');

exports.signTransactionEvm = async(transactionObject, options) =>{

    const rawData = await Ethereum.signTransactionEvm(transactionObject, options);
    return rawData;
};

