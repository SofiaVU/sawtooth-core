/**
 * Copyright 2017 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ----------------------------------------------------------------------------
 */
'use strict'

const { signer, BatchEncoder } = require('sawtooth-sdk')
const { TransactionHeader, TransactionList } = require('sawtooth-sdk/protobuf')
const { BadRequest, Unauthorized } = require('../api/errors')

const PRIVATE_KEY = process.env.PRIVATE_KEY
let batcher = null
let publicKey = null

if (!PRIVATE_KEY) {
  console.warn(`No signing key provided, server cannot submit transactions`)
  console.warn('Use the "PRIVATE_KEY" environment variable to set a key.')
} else {
  batcher = new BatchEncoder(PRIVATE_KEY)
  publicKey = signer.getPublicKey(PRIVATE_KEY)
}

const batch = (txnList, expectedSigner) => {
  if (!PRIVATE_KEY) {
    throw new Error(`Server has no signing key, and cannot batch transacitons`)
  }

  const txns = TransactionList.decode(txnList).transactions
  const headers = txns.map(txn => TransactionHeader.decode(txn.header))

  headers.forEach(header => {
    if (header.batcherPubkey !== publicKey) {
      throw new BadRequest(`Transactions must use batcherPubkey: ${publicKey}`)
    }
    if (header.signerPubkey !== expectedSigner) {
      throw new Unauthorized('Authorized user must match the signing key')
    }
  })

  return batcher.create(txns)
}

module.exports = {
  batch
}
