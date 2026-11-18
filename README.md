# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Mobile quotation page

A mobile-first quotation workflow is available at `/mobile-quotation` for authenticated users. It reuses the existing SKU Google Apps Script lookup, quotation API, Supabase storage flow, and PDF generator.

- Customer details, SKU/size entry, manual-rate items, discounts, shipping and advance.
- PDF preview before confirmation.
- Confirm & Save writes through the existing `/api/quotations` service and downloads the PDF.
- Old quotations can be loaded; their saved MRP/rate/item snapshots are kept rather than recalculated from the current product sheet.
- Existing desktop quotation page remains available at `/quotation`.

The PDF generator now accepts `generateQuotationPDF(data, "open")` for preview; its default behavior remains download.
