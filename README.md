# Fleet-VC

**A Local-First Point of Sale (POS) and Inventory Management Application**

Fleet-VC is a retail management application designed to simplify everyday store operations. It combines point-of-sale functionality, inventory management, transaction tracking, and business analytics in one interface.

Built with React Native and Expo, Fleet-VC is designed to provide a straightforward experience for store owners and cashiers.

---

## Features

### 1. Dashboard
- View total revenue and completed transactions.
- Monitor average transaction value and units sold.
- Analyze sales trends across different periods.
- View payment method breakdowns.
- Identify best-selling products.
- Monitor low-stock and out-of-stock products.

### 2. Point of Sale (POS)
- Browse and search available products.
- Add products to a shopping cart.
- Adjust product quantities.
- Calculate transaction totals.
- Select payment methods:
  - Cash
  - QRIS
  - Card
- Complete transactions and automatically update inventory.

### 3. Inventory Management
- Add new products.
- Edit existing product information.
- Delete products.
- Increase or decrease stock quantities.
- Search products by name or SKU.
- Sort products by name, stock quantity, and price.
- Filter products by stock availability.
- Configure low-stock warnings.

### 4. Transaction History
- View completed transactions.
- Search transactions by transaction ID.
- Filter transactions by date.
- Filter by payment method.
- View detailed transaction receipts.
- Review purchased products, quantities, and payment totals.

### 5. Account and Store Settings
- Edit user profile information.
- Configure store name.
- Select IDR or USD display currency.
- Configure a manual USD exchange rate.
- Set the global low-stock threshold.
- Manage account logout.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React Native | Application framework |
| Expo | Development and runtime environment |
| JavaScript | Application programming language |
| AsyncStorage | Local application data persistence |
| Expo SecureStore | Secure local storage integration |
| Lucide React Native | Icons |
| React Native Web | Browser compatibility |

---

## Getting Started

Follow these instructions to run Fleet-VC on your local machine.

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [Visual Studio Code](https://code.visualstudio.com/) (recommended)

You should also have access to a terminal such as PowerShell, Command Prompt, or the VS Code integrated terminal.

### 1. Clone the repository

Open your terminal and run:

```bash
git clone https://github.com/Sunderpearl/Fleet-VC.git
```

### 2. Navigate to the project directory

```bash
cd Fleet-VC
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the application

To run Fleet-VC in your web browser:

```bash
npx expo start --web
```

Alternatively, start the Expo development server:

```bash
npx expo start
```

You can then use the Expo development server to launch the application on a supported device or emulator.

---

## Demo Account

For users who want to explore the application immediately, Fleet-VC includes a local demo account.

| Field | Credentials |
|---|---|
| Email | `owner@fleet.local` |
| Password | `fleet123` |

**Note:** These are prototype demo credentials, not a real online account.

You can also register a new local account through the application's registration flow.

---

## How to Use

### First-time setup

1. Launch Fleet-VC.
2. Log in using the demo credentials or create a new account.
3. Open the Account tab.
4. Configure your store name and preferred currency.
5. Set your low-stock warning threshold.
6. Navigate to Inventory and add your products.

### Processing a transaction

1. Open the POS screen.
2. Search for a product.
3. Add the product to your cart.
4. Adjust quantities as necessary.
5. Review your order.
6. Select a payment method.
7. Complete checkout.

Your transaction will be recorded locally, and the corresponding inventory quantities will be updated.

---

## Important Notes and Limitations

Fleet-VC is currently a **local-first prototype**.

Please keep the following limitations in mind:

- Application data is stored locally on the device.
- There is currently no confirmed production cloud database or multi-device synchronization.
- QRIS and card payments are recorded as payment methods; real payment gateway processing is not integrated.
- USD conversion uses a manually configured exchange rate rather than a live financial data source.
- Authentication is intended for prototype use and should not be considered production-grade security.
- Clearing browser or application storage may result in data loss.

For these reasons, Fleet-VC should currently be used for demonstration, experimentation, and development rather than handling real commercial transactions.

---

## Project Structure

```text
Fleet-VC/
│
├── App.js
├── app.json
├── package.json
├── package-lock.json
├── babel.config.js
├── eas.json
│
└── src/
    ├── api.js
    ├── auth.js
    ├── icons.js
    ├── money.js
    ├── storage.js
    ├── theme.js
    ├── ui.js
    │
    └── screens/
        ├── Account.js
        ├── Dashboard.js
        ├── Inventory.js
        ├── Login.js
        ├── POS.js
        └── Transactions.js
```

---

## Contributing

Contributions, suggestions, and bug reports are welcome.

If you would like to contribute:

1. Fork the repository.
2. Create a new branch for your changes.
3. Implement your improvements.
4. Test your changes locally.
5. Submit a Pull Request.

Please describe your changes clearly when submitting a contribution.

---

## License

No license has been specified yet.

Please contact the repository maintainers before redistributing or using this project commercially.

---

## Acknowledgements

Developed collaboratively as a retail POS and inventory management project.

**Fleet-VC — Simplifying everyday retail operations.**