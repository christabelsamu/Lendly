# Decentralized Micro-Lending Platform

A peer-to-peer micro-lending platform built on the Stacks blockchain that enables users to lend and borrow cryptocurrency with smart contract-enforced terms and a reputation-based system.

## 🌟 Features

- **Smart Contract Lending**: Fully automated loan lifecycle management
- **Reputation System**: Track and reward responsible lending behavior
- **Collateral Management**: Secure lending with automated collateral handling
- **Interest Rate Management**: Flexible interest rate settings
- **Default Protection**: Automatic collateral claiming for defaults
- **Comprehensive Testing**: 100% test coverage of core functionality

## 🔧 Technical Stack

- **Smart Contracts**: Clarity (Stacks blockchain)
- **Testing Framework**: Vitest
- **Contract Testing**: micro-stacks/clarity
- **Development Tools**: Clarinet

## 📋 Prerequisites

- Node.js (v16+)
- Clarinet CLI
- Stacks wallet for deployment
- Git

## 🚀 Quick Start

1. Clone the repository:
```bash
git clone https://github.com/your-org/micro-lending-platform.git
cd micro-lending-platform
```

2. Install dependencies:
```bash
npm install
```

3. Run tests:
```bash
npm test
```

4. Deploy contract (testnet):
```bash
clarinet deploy --network testnet
```

## 📖 Smart Contract API

### Create Loan
```clarity
(create-loan (amount uint) (interest-rate uint) (duration uint) (collateral uint))
```
- `amount`: Loan amount in micro-STX
- `interest-rate`: Annual interest rate (basis points)
- `duration`: Loan duration in blocks
- `collateral`: Collateral amount in micro-STX

### Fund Loan
```clarity
(fund-loan (loan-id uint))
```
- `loan-id`: ID of the loan to fund

### Repay Loan
```clarity
(repay-loan (loan-id uint))
```
- `loan-id`: ID of the loan to repay

### Claim Defaulted Loan
```clarity
(claim-defaulted-loan (loan-id uint))
```
- `loan-id`: ID of the defaulted loan to claim

## 🔒 Security Features

1. **Collateral Management**
    - Automated locking and release
    - Smart contract-controlled custody
    - Default protection

2. **Access Controls**
    - Role-based function access
    - Borrower/lender verification
    - Owner-only administrative functions

3. **Input Validation**
    - Amount minimums
    - Duration constraints
    - Balance checks

## 🧪 Testing

The project includes comprehensive tests covering:
- Loan lifecycle
- Error conditions
- Edge cases
- Reputation system
- Access controls

Run tests with:
```bash
npm test
```

## 📈 Future Enhancements

1. **Phase 2 Features**
    - Multi-token support
    - Variable interest rates
    - Loan refinancing
    - Partial repayments
    - Secondary market for loans

2. **Technical Improvements**
    - Gas optimization
    - Enhanced monitoring
    - Analytics dashboard
    - Mobile app integration

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License
