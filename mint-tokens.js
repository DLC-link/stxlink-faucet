import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  standardPrincipalCV,
  uintCV,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network";
import hcaptcha from "hcaptcha";
import asyncHandler from "express-async-handler";
import sqlite3 from "sqlite3";
import createError from "http-errors";

export const checkCaptcha = asyncHandler(async (req, res, next) => {
  console.debug("verifying captcha...");
  const captchaData = await hcaptcha.verify(
    process.env.HCAPTCHA_SECRET,
    req.body["h-captcha-response"]
  );

  if (!captchaData.success) {
    next(createError(403, "Captcha verification failed"));
  } else {
    next();
  }
});

export const fetchAddressData = asyncHandler((req, res, next) => {
  req.db = new sqlite3.Database("faucet.db");
  req.now = new Date().getTime();
  req.sender = process.env.SENDER_ADDRESS;

  console.debug(
    `time: ${req.now}, requester: ${req.body.address}, sender: ${req.sender}`
  );
  console.debug("fetching address data...");

  req.db.serialize(() => {
    req.db.run(
      "CREATE TABLE IF NOT EXISTS address \
       (id INTEGER PRIMARY KEY AUTOINCREMENT, address TEXT UNIQUE, lastmint INTEGER)"
    );
    req.db.run(
      "CREATE TABLE IF NOT EXISTS nonce \
       (id INTEGER PRIMARY KEY AUTOINCREMENT, address TEXT, nonce INTEGER, lastfetch INTEGER)"
    );

    req.db
      .prepare("SELECT nonce, lastfetch FROM nonce WHERE address = ?")
      .get([req.sender], (err, row) => {
        if (err) {
          next(createError(500, "Error getting nonce"));
        } else {
          req.nonce = row?.nonce;
          req.lastfetch = row?.lastfetch;
        }
      });
    req.db
      .prepare("SELECT lastmint FROM address WHERE address = ?")
      .get([req.body.address], (err, row) => {
        if (err) {
          next(createError(500, "Database error"));
        } else {
          req.lastmint = row?.lastmint;
          next(); // db.serialize guarantees sync until this point.
        }
      });
  });
});

export const checkLimits = (req, res, next) => {
  console.debug(
    `nonce: ${req.nonce}, lastfetch: ${req.lastfetch}, lastmint: ${req.lastmint}`
  );
  console.debug("checking mint time limits...");
  if (req.now - req.lastmint < 60 * 1000) {
    next(createError(403, "Please wait before requesting more tokens!"));
  } else {
    req.db
      .prepare(
        "INSERT OR REPLACE INTO address (id, address, lastmint) \
       VALUES ((SELECT id FROM address WHERE address = ?), ?, ?)"
      )
      .run([req.body.address, req.body.address, req.now]);
    next();
  }
};

export const getNonce = asyncHandler(async (req, res, next) => {
  if (!req.nonce || req.now - req.lastfetch > 60 * 10000) {
    console.debug("fetching new nonce...");
    req.nonce = await fetch(
      `https://stacks-node-api.testnet.stacks.co/v2/accounts/${req.sender}?proof=0`
    )
      .then((r) => r.json())
      .then((d) => d.nonce);
    req.lastfetch = req.now;
  }

  next();
});

export const sendTransaction = asyncHandler(async (req, res, next) => {
  console.debug("sending stacks transaction with nonce: ", req.nonce);
  const network = new StacksTestnet();
  const txOptions = {
    contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    contractName: "stxlink-token",
    functionName: "mint-tokens",
    functionArgs: [uintCV(5000), standardPrincipalCV(req.body.address)],
    senderKey: process.env.SENDER_KEY,
    validateWithAbi: true,
    anchorMode: AnchorMode.Any,
    nonce: req.nonce,
    network,
  };

  const transaction = await makeContractCall(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network);

  console.debug("txid:", broadcastResponse.txid);

  req.db
    .prepare(
      "INSERT OR REPLACE INTO nonce (id, address, nonce, lastfetch) \
   VALUES ((SELECT id FROM nonce WHERE address = ?), ?, ?, ?)"
    )
    .run([req.sender, req.sender, req.nonce + 1, req.lastfetch]);

  if (broadcastResponse.error) {
    console.error("broadcastResponse:", broadcastResponse);
    next(
      createError(
        500,
        "Error minting token. Please check address or try again later!"
      )
    );
  } else {
    return res.redirect(
      `/sent/?addr=${req.body.address}&txId=${broadcastResponse.txid}`
    );
  }
});
