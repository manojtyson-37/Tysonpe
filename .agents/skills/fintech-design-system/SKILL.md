---
name: fintech-design-system
description: "Fintech design system skill for Tysonpe, incorporating Skiper UI, Animaster Lib, Vengeance UI components and Refero.design benchmarks."
---

# Fintech Design System (Tysonpe)

Guides implementation of high-trust creator commerce and payment interfaces.

## 1. Gateway Simulation Architecture
- **Razorpay Standard Checkout**: Simulated as a high-fidelity modal popup with an iframe-style header, merchant details, payment method tabs, live QR generator, card validation, and "Secured by Razorpay" footer.
- **Easebuzz Hosted Checkout**: Simulated as a full-page checkout redirect with merchant banner, transaction ID, dynamic 15-minute countdown clock, bank selection grid, and automated return redirect.

## 2. Vector Brand System
Always use bespoke SVG vector assets from `@/components/gateway-icons`:
- UPI: Google Pay, PhonePe, Paytm, BHIM UPI
- Cards: Visa, Mastercard, RuPay
- Netbanking: HDFC Bank, SBI, ICICI Bank, Axis Bank
- Security: 256-bit SSL, PCI-DSS Level 1, ISO 27001 badges

## 3. Component Blueprints
- **Interactive Segmented Control (Skiper UI)**:
  Use active pill transitions with `transition-all duration-200 ease-out`.
- **Perspective Feature Card (Vengeance UI)**:
  `rounded-2xl border border-line bg-surface p-6 shadow-xs hover:border-brand/40 hover:shadow-md transition-all duration-200`.
- **Fluid Blur Header (Animaster Lib)**:
  `sticky top-0 z-40 backdrop-blur-md bg-surface/80 border-b border-line/60`.
