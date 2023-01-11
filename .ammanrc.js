'use strict';
// @ts-check
// const path = require('path');
// const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const base = require('../metaplex-program-library/.base-ammanrc.js');


// find solana-program-library
// const solanaProgramLibraryDeployPath = '../solana-program-library/target/deploy';

const validator = {
    ...base.validator,
    programs: [
        base.programs.metadata,
        // {
        //     label: 'SPL Token Program',
        //     programId: TOKEN_PROGRAM_ID.toString(),
        //     deployPath: path.join(solanaProgramLibraryDeployPath, 'spl_token.so'),
        // }
    ],
};

const storage = {
    enabled: true,
    storageId: 'mock-storage',
    clearOnStart: true,
};

module.exports = { validator, storage };
