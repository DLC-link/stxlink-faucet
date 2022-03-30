# STX-Link Faucet

A simple faucet to get STX-Link tokens for testing.

## Requirements

- NodeJS ^16.14.0
- npm ^8.5.0

Tested on MacOS and Linux.

## Gettings started

You need to create a file named `.env` in the root directory with a valid
`SENDER_KEY` and `SENDER_ADDRESS` belonging to an account that can mint STXLINK.
And a valid `HCAPTCHA_SECRET` associated with the `HCAPTCHA_SITEKEY`.

You can use the following for testing:

```sh
SENDER_KEY=d7018cd0ffa513fb28c2b14ce66f6f645fc57ad286e2e49ad24539c0135fb2f101
SENDER_ADDRESS=ST2VFN0S3GDHG5QVZ1G125FAGK6E8GDE67VZ13A4S
HCAPTCHA_SECRET=0xfA73EC7Cbc08F298e959722743075C3FB7d090F2
HCAPTCHA_SITEKEY=867b5e25-4b00-40fc-b052-6200c888b8b9
```

Then use the following commands to start the development server:

```sh
npm install
npm run dev
```

## Deployment

Deploy as you would any expressJS application.
