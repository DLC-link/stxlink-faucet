import "dotenv/config";
import { URL } from "url";
import express from "express";
import logger from "morgan";
import {
  checkCaptcha,
  checkLimits,
  getNonce,
  fetchAddressData,
  sendTransaction,
} from "./mint-tokens.js";

const app = express();
const port = process.env.DEBUG === "true" ? 3000 : 80;

app.set("views", new URL("./views", import.meta.url).pathname);
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(new URL("./public", import.meta.url).pathname));

app.get("/", (req, res, next) => {
  res.render("index", { ...req.query, sitekey: process.env.HCAPTCHA_SITEKEY });
});

app.get("/sent", (req, res, next) => {
  res.render("sent", req.query);
});

app.post("/get-stx-link", [
  checkCaptcha,
  fetchAddressData,
  checkLimits,
  getNonce,
  sendTransaction,
]);

app.use((req, res, next) => {
  return res.redirect("/");
});

app.use((err, req, res, next) => {
  return res.redirect(
    `/?err=${encodeURIComponent(
      err.status && err.message
        ? err.message
        : "Internal server error. Please check address or try again later!"
    )}`
  );
});

app.listen(port, () => {
  console.log(`STXLINK Faucet listening on port ${port}`);
});
