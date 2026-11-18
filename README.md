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
Checkout is a front-end exhibition demo only; it does not transmit customer data or process payments.
The contact form delivers enquiries to it.me.faizan.khan08@gmail.com through FormSubmit. Confirm the activation email sent by FormSubmit after the first submission before expecting enquiries to arrive.

## Firebase Hosting
This is a static website, so Firebase Hosting can serve it without a backend. The responsive layout works on desktop and mobile browsers. Firebase Hosting provides HTTPS and a free `web.app` URL.

This project is connected to Firebase project `elvare-app` in `.firebaserc`. The `firebase.json` configuration serves the project root, excludes `.venv` and Git files, and does not rewrite the checkout page to `index.html`.

### Deploy
1. Make sure your Google account has access to the `elvare-app` Firebase project.
2. Install Node.js, then install and sign in to the Firebase CLI:
   ```powershell
   npm install -g firebase-tools
   firebase login
   ```
3. In a terminal, open this project folder and deploy:
   ```powershell
   cd "D:\Web Tech Project\ecommerce-project"
   firebase deploy --only hosting
   ```
   The site URL is [https://elvare-app.web.app](https://elvare-app.web.app) (also available at `https://elvare-app.firebaseapp.com`).
4. After making site changes, run `firebase deploy --only hosting` again to publish them.

See the official [Firebase Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart) for details. The contact form uses FormSubmit; confirm its activation email after the first submission before expecting enquiries to arrive.

## Files
index.html - storefront. checkout.html - responsive checkout and order confirmation. assets/favicon.svg - ÉLVARÉ browser icon. css/style.css - custom styling. js/script.js - store interactions. js/checkout.js - checkout validation and demo confirmation.
To change products, edit the P array at the top of js/script.js.

## Motion and interaction
Preloader, hero slider with split-text reveal and progress bars, brand marquee, drag slider for new arrivals, testimonial slider with swipe, animated counters, scroll progress bar, auto-hiding navbar, magnetic buttons, and a custom cursor with context labels (desktop only).
