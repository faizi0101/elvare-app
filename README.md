# ÉLVARÉ - Premium E-Commerce Website

Web Technology Lab Final Exhibition Project.

## Brand
Name: ÉLVARÉ. Tagline: Quiet luxury, beautifully made.
Category: premium watches, bags, eyewear and footwear.
Palette: Obsidian Black #171717, Warm Ivory #E9E0D2, Muted Champagne #B49A78, Soft Cream #F8F6F1.
Fonts: Cormorant Garamond (headings), Jost (body).

## Technologies
HTML5, CSS3, Bootstrap 5.3, Vanilla JavaScript, Bootstrap Icons. No frameworks or backend.

## Run in VS Code
1. Open the ecommerce-project folder in VS Code.
2. Install the Live Server extension.
3. Right-click index.html and choose Open with Live Server.
An internet connection is needed for Bootstrap, icons, fonts and Unsplash photos.

## Features
Add to cart, live counter, cart sidebar, quantity change, remove item, subtotal, search, category filter, wishlist, quick-view modal, newsletter validation, responsive delivery checkout, demo cash-on-delivery and Easypaisa payment options, mobile menu, smooth scrolling, scroll reveal, hero parallax.
Cart and wishlist persist with localStorage.
Checkout remains a demo only: it does not process payments. Orders are stored as pending and confirmed only after the customer clicks the approval link sent to their email. Contact enquiries are sent through Web3Forms to the recipient associated with your access key; Web3Forms does not verify that a visitor owns the reply-to email address.

## Firebase Hosting
This is a static website, so Firebase Hosting can serve it without a backend. The responsive layout works on desktop and mobile browsers. Firebase Hosting provides HTTPS and a free `web.app` URL.

This project is connected to Firebase project `elvare-app` in `.firebaserc`. Hosting serves the project root, excludes `.venv` and Git files, and routes `/api/**` requests to the Functions backend in Mumbai (`asia-south1`). Firestore rules deny direct browser access; only the backend accesses demo order records. Firestore TTL policies delete unverified orders after 24 hours and confirmed order records after 7 days. The contact form uses Web3Forms and does not require the Firebase backend.

The order-verification backend is implemented in `functions/`, but it is not live until Firestore is enabled, billing is configured, the Gmail secret is set, and the Firebase resources below are deployed. Until then, email-approved orders are unavailable. The contact form can work independently as soon as its Web3Forms access key is configured.

### Configure the contact form (Web3Forms)
1. Create a free access key at [web3forms.com](https://web3forms.com/) for `it.me.faizan.khan08@gmail.com` and retrieve the key from the email they send you.
2. In `index.html`, replace `YOUR_WEB3FORMS_ACCESS_KEY` in the contact form's hidden `access_key` field with that key. Web3Forms access keys are designed to be public in frontend code; do not use a password or Gmail App Password here.
3. Submit the contact form on the live site to test delivery. The form reports success only when Web3Forms accepts the submission. Invalid email formats are rejected by the browser; a syntactically valid but unreachable address cannot be proven or rejected without an email-verification flow.

The form content is sent to Web3Forms to deliver to the email address associated with the access key. Replies use the visitor-provided email as the reply-to address; that address is not authenticated.

### Deploy
1. Make sure your Google account has access to Firebase project `elvare-app`. Enable the **Cloud Firestore API** for this project in [Google Cloud Console](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=elvare-app).
2. Create the default Firestore database in Mumbai (`asia-south1`) if one does not already exist. Database location is permanent:
   ```powershell
   firebase firestore:databases:create "(default)" --location asia-south1 --project elvare-app
   ```
3. Cloud Functions deployment requires the Firebase **Blaze** (pay-as-you-go) plan and a billing account. Review Firebase pricing and set a budget alert before enabling billing.
4. Enable 2-Step Verification on the Gmail sender account, create a Google App Password, then store it as a Firebase secret. Run this in your own terminal and enter the App Password only at the CLI prompt; never put it in source code or commit it:
   ```powershell
   firebase functions:secrets:set GMAIL_APP_PASSWORD --project elvare-app
   ```
   The sender and contact destination are `it.me.faizan.khan08@gmail.com`.
5. Install Node.js 22 and the Firebase CLI if needed, sign in, install the Functions dependencies, and deploy Hosting, the API, and Firestore rules:
   ```powershell
   npm install -g firebase-tools
   firebase login
   cd "D:\Web Tech Project\ecommerce-project"
   cd functions
   npm install
   cd ..
   firebase deploy --only firestore:rules,functions,hosting --project elvare-app
   ```
6. The site URL is [https://elvare-app.web.app](https://elvare-app.web.app) (also available at `https://elvare-app.firebaseapp.com`). After website changes, deploy Hosting again; after backend or rules changes, deploy the corresponding Firebase targets.

Email verification proves that someone can open the message sent to that address; it cannot tell you in advance whether a syntactically valid but unreachable mailbox exists. Firestore TTL cleanup is asynchronous and may take up to 24 hours after the configured expiry. Cloud Functions and Firestore usage can incur charges, so monitor usage and billing.

## Files
index.html - storefront. checkout.html - responsive checkout and order confirmation. assets/favicon.svg - ÉLVARÉ browser icon. css/style.css - custom styling. js/script.js - store interactions. js/checkout.js - checkout validation and demo confirmation.
To change products, edit the P array at the top of js/script.js.

## Motion and interaction
Preloader, hero slider with split-text reveal and progress bars, brand marquee, drag slider for new arrivals, testimonial slider with swipe, animated counters, scroll progress bar, auto-hiding navbar, magnetic buttons, and a custom cursor with context labels (desktop only).
