import { describe, test, expect, beforeEach } from 'vitest';
import { Clarinet, Tx, Chain, Account, types } from 'micro-stacks/clarity';
import { principalCV, uintCV, stringAsciiCV } from 'micro-stacks/clarity';

describe('micro-lending', () => {
  let chain: Chain;
  let deployer: Account;
  let wallet1: Account;
  let wallet2: Account;
  
  beforeEach(async () => {
    chain = await Clarinet.newTestChain();
    [deployer, wallet1, wallet2] = chain.accounts.values();
  });
  
  describe('create-loan', () => {
    test('successfully creates a loan with valid parameters', () => {
      const amount = 5000000; // 5 STX
      const interestRate = 50; // 5%
      const duration = 144; // ~1 day in blocks
      const collateral = 6000000; // 6 STX
      
      const block = chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'create-loan',
            [
              uintCV(amount),
              uintCV(interestRate),
              uintCV(duration),
              uintCV(collateral)
            ],
            wallet1.address
        )
      ]);
      
      // Assert successful transaction
      expect(block.receipts[0].result).toBeDefined();
      expect(block.receipts[0].result).toMatch(/u[0-9]+/); // Should return loan ID
      
      // Verify loan creation
      const loan = chain.callReadOnlyFn(
          'micro-lending',
          'get-loan',
          [uintCV(1)],
          wallet1.address
      );
      
      const loanData = loan.result.expectSome().expectTuple();
      expect(loanData.amount.expectUint()).toBe(amount);
      expect(loanData.borrower.expectPrincipal()).toBe(wallet1.address);
      expect(loanData.status.expectAscii()).toBe('CREATED');
    });
    
    test('fails when amount is below minimum', () => {
      const block = chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'create-loan',
            [
              uintCV(100), // Very small amount
              uintCV(50),
              uintCV(144),
              uintCV(200)
            ],
            wallet1.address
        )
      ]);
      
      expect(block.receipts[0].result).toBeErr(102); // err-invalid-amount
    });
    
    test('fails when collateral is insufficient', () => {
      const block = chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'create-loan',
            [
              uintCV(5000000),
              uintCV(50),
              uintCV(144),
              uintCV(999999999999) // Collateral larger than wallet balance
            ],
            wallet1.address
        )
      ]);
      
      expect(block.receipts[0].result).toBeErr(103); // err-insufficient-balance
    });
  });
  
  describe('fund-loan', () => {
    beforeEach(async () => {
      // Create a loan before each test
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'create-loan',
            [
              uintCV(5000000),
              uintCV(50),
              uintCV(144),
              uintCV(6000000)
            ],
            wallet1.address
        )
      ]);
    });
    
    test('successfully funds an existing loan', () => {
      const block = chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'fund-loan',
            [uintCV(1)],
            wallet2.address
        )
      ]);
      
      expect(block.receipts[0].result).toBeOk(true);
      
      // Verify loan status
      const loan = chain.callReadOnlyFn(
          'micro-lending',
          'get-loan',
          [uintCV(1)],
          wallet2.address
      );
      
      const loanData = loan.result.expectSome().expectTuple();
      expect(loanData.status.expectAscii()).toBe('ACTIVE');
      expect(loanData.lender.expectPrincipal()).toBe(wallet2.address);
    });
    
    test('fails when loan does not exist', () => {
      const block = chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'fund-loan',
            [uintCV(999)],
            wallet2.address
        )
      ]);
      
      expect(block.receipts[0].result).toBeErr(101); // err-not-found
    });
    
    test('fails when loan is already funded', async () => {
      // Fund the loan first
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'fund-loan',
            [uintCV(1)],
            wallet2.address
        )
      ]);
      
      // Try to fund again
      const block = chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'fund-loan',
            [uintCV(1)],
            wallet2.address
        )
      ]);
      
      expect(block.receipts[0].result).toBeErr(104); // err-loan-exists
    });
  });
  
  describe('repay-loan', () => {
    beforeEach(async () => {
      // Create and fund a loan before each test
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'create-loan',
            [
              uintCV(5000000),
              uintCV(50),
              uintCV(144),
              uintCV(6000000)
            ],
            wallet1.address
        )
      ]);
      
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'fund-loan',
            [uintCV(1)],
            wallet2.address
        )
      ]);
    });
    
    test('successfully repays a loan', () => {
      const block = chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'repay-loan',
            [uintCV(1)],
            wallet1.address
        )
      ]);
      
      expect(block.receipts[0].result).toBeOk(true);
      
      // Verify loan status
      const loan = chain.callReadOnlyFn(
          'micro-lending',
          'get-loan',
          [uintCV(1)],
          wallet1.address
      );
      
      const loanData = loan.result.expectSome().expectTuple();
      expect(loanData.status.expectAscii()).toBe('REPAID');
    });
    
    test('fails when non-borrower tries to repay', () => {
      const block = chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'repay-loan',
            [uintCV(1)],
            wallet2.address // Not the borrower
        )
      ]);
      
      expect(block.receipts[0].result).toBeErr(105); // err-unauthorized
    });
  });
  
  describe('claim-defaulted-loan', () => {
    beforeEach(async () => {
      // Create and fund a loan before each test
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'create-loan',
            [
              uintCV(5000000),
              uintCV(50),
              uintCV(144),
              uintCV(6000000)
            ],
            wallet1.address
        )
      ]);
      
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'fund-loan',
            [uintCV(1)],
            wallet2.address
        )
      ]);
    });
    
    test('successfully claims defaulted loan after duration', () => {
      // Mine enough blocks to pass duration
      for (let i = 0; i < 145; i++) {
        chain.mineEmptyBlock();
      }
      
      const block = chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'claim-defaulted-loan',
            [uintCV(1)],
            wallet2.address
        )
      ]);
      
      expect(block.receipts[0].result).toBeOk(true);
      
      // Verify loan status
      const loan = chain.callReadOnlyFn(
          'micro-lending',
          'get-loan',
          [uintCV(1)],
          wallet2.address
      );
      
      const loanData = loan.result.expectSome().expectTuple();
      expect(loanData.status.expectAscii()).toBe('DEFAULTED');
    });
    
    test('fails when loan duration has not passed', () => {
      const block = chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'claim-defaulted-loan',
            [uintCV(1)],
            wallet2.address
        )
      ]);
      
      expect(block.receipts[0].result).toBeErr(106); // err-loan-not-due
    });
    
    test('fails when non-lender tries to claim', () => {
      // Mine enough blocks to pass duration
      for (let i = 0; i < 145; i++) {
        chain.mineEmptyBlock();
      }
      
      const block = chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'claim-defaulted-loan',
            [uintCV(1)],
            wallet1.address // Not the lender
        )
      ]);
      
      expect(block.receipts[0].result).toBeErr(105); // err-unauthorized
    });
  });
  
  describe('user-reputation', () => {
    test('updates reputation after successful repayment', async () => {
      // Create and fund a loan
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'create-loan',
            [
              uintCV(5000000),
              uintCV(50),
              uintCV(144),
              uintCV(6000000)
            ],
            wallet1.address
        )
      ]);
      
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'fund-loan',
            [uintCV(1)],
            wallet2.address
        )
      ]);
      
      // Repay the loan
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'repay-loan',
            [uintCV(1)],
            wallet1.address
        )
      ]);
      
      // Check reputation
      const reputation = chain.callReadOnlyFn(
          'micro-lending',
          'get-user-reputation',
          [principalCV(wallet1.address)],
          wallet1.address
      );
      
      const repData = reputation.result.expectTuple();
      expect(repData.loans_paid.expectUint()).toBe(1);
      expect(repData.lending_score.expectUint()).toBeGreaterThan(50); // Should increase
    });
    
    test('updates reputation after default', async () => {
      // Create and fund a loan
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'create-loan',
            [
              uintCV(5000000),
              uintCV(50),
              uintCV(144),
              uintCV(6000000)
            ],
            wallet1.address
        )
      ]);
      
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'fund-loan',
            [uintCV(1)],
            wallet2.address
        )
      ]);
      
      // Mine blocks to pass duration
      for (let i = 0; i < 145; i++) {
        chain.mineEmptyBlock();
      }
      
      // Claim default
      await chain.mineBlock([
        Tx.contractCall(
            'micro-lending',
            'claim-defaulted-loan',
            [uintCV(1)],
            wallet2.address
        )
      ]);
      
      // Check reputation
      const reputation = chain.callReadOnlyFn(
          'micro-lending',
          'get-user-reputation',
          [principalCV(wallet1.address)],
          wallet1.address
      );
      
      const repData = reputation.result.expectTuple();
      expect(repData.loans_defaulted.expectUint()).toBe(1);
      expect(repData.lending_score.expectUint()).toBeLessThan(50); // Should decrease
    });
  });
});
